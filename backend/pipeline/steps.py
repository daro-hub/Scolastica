"""
Presentation generation pipeline: explicit steps instead of one long
try/except inside the endpoint (which is what main.py used to do).

Each step is a small async function ``(ctx) -> ctx`` that can be
unit-tested on its own (see tests/test_steps.py). ``run_presentation_job``
orchestrates them and persists progress to the DB after every step, so
``GET /v2/generations/{id}`` can report the real current step instead of
the frontend guessing percentages, and a mid-run crash leaves the job
visibly "failed" with a real error instead of vanishing into a dict that
gets garbage-collected on restart.

Known limitation: if the process restarts mid-job, nothing resumes it —
the job just stays at its last persisted step forever (the row is still
there, just not being worked on). Acceptable for this project's scale
(one operator, one job at a time, jobs run in a couple of minutes); a
real queue with a resumable worker would be the next step if this needed
to survive restarts.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

import db
from config import GROUNDING_THRESHOLD
from llm import LLMError, call_llm
from pipeline.grounding import annotate_grounding
from pipeline.schema import PlanParseError, SlidePlan, parse_plan, validate_plan
from services import pptx_service

logger = logging.getLogger(__name__)

MAX_REPAIR_ATTEMPTS = 1


class PipelineError(RuntimeError):
    """A pipeline step failed in a way that should stop the job (not a bug to retry blindly)."""


async def _step_extract(ctx: dict[str, Any]) -> dict[str, Any]:
    ctx["content"] = await asyncio.to_thread(pptx_service.extract_content, ctx["file_path"])
    return ctx


def _parse_or_raise(raw_text: str) -> SlidePlan:
    try:
        return parse_plan(json.loads(raw_text))
    except (json.JSONDecodeError, PlanParseError):
        cleaned = pptx_service._attempt_json_extraction(raw_text)
        if cleaned is None:
            raise PipelineError(
                f"Il modello ha restituito JSON non valido o non conforme allo schema. "
                f"Inizio risposta: {raw_text[:300]}"
            )
        return parse_plan(cleaned)


def _build_repair_prompt(original_prompt: str, bad_output: str, errors: list[str]) -> str:
    error_list = "\n".join(f"- {e}" for e in errors)
    return (
        f"{original_prompt}\n\n"
        "## YOUR PREVIOUS ANSWER WAS INVALID\n"
        f"You previously answered:\n{bad_output[:4000]}\n\n"
        "That answer has these problems. Fix them and answer again with the FULL corrected "
        "JSON (same array format, no markdown fencing, no explanation):\n"
        f"{error_list}"
    )


async def _step_plan(ctx: dict[str, Any]) -> dict[str, Any]:
    prompt = pptx_service.build_plan_prompt(
        content=ctx["content"],
        master_layouts=ctx["master_layouts"],
        num_variants=ctx["num_variants"],
        custom_prompt=ctx.get("custom_prompt"),
    )
    raw_text = await call_llm(prompt, max_tokens=32000)
    plan = _parse_or_raise(raw_text)
    errors = validate_plan(plan, ctx["master_layouts"])

    attempts = 0
    while errors and attempts < MAX_REPAIR_ATTEMPTS:
        attempts += 1
        logger.warning("Plan failed validation (attempt %d/%d): %s", attempts, MAX_REPAIR_ATTEMPTS, errors)
        repair_prompt = _build_repair_prompt(prompt, raw_text, errors)
        raw_text = await call_llm(repair_prompt, max_tokens=32000)
        plan = _parse_or_raise(raw_text)
        errors = validate_plan(plan, ctx["master_layouts"])

    if errors:
        raise PipelineError(
            "Il piano generato dal modello non è valido rispetto al template master, "
            f"anche dopo {attempts} tentativo/i di correzione: " + "; ".join(errors[:5])
        )

    ctx["plan"] = plan
    return ctx


async def _step_ground(ctx: dict[str, Any]) -> dict[str, Any]:
    plan_dicts = [s.model_dump() for s in ctx["plan"].sections]
    source_text = ctx["content"].get("full_text", "")
    annotate_grounding(plan_dicts, source_text, GROUNDING_THRESHOLD)
    ctx["plan_dicts"] = plan_dicts
    return ctx


async def _step_render(ctx: dict[str, Any]) -> dict[str, Any]:
    all_pptx_path = await asyncio.to_thread(
        pptx_service.build_all_variants_pptx, ctx["master_path"], ctx["plan_dicts"]
    )
    png_paths = await asyncio.to_thread(pptx_service.pptx_to_pngs, all_pptx_path, ctx["output_dir"])

    sections_result = []
    slide_idx = 0
    for section in ctx["plan_dicts"]:
        section_variants = []
        for v_idx, variant in enumerate(section.get("variants", [])):
            if slide_idx >= len(png_paths):
                break
            fills = variant.get("placeholder_fills", {})
            image_idx = next((idx for idx, f in fills.items() if f.get("type") == "image"), None)
            section_variants.append({
                "variant_index": v_idx,
                "slide_index": slide_idx,
                "layout_index": variant.get("layout_index", 0),
                "layout_name": variant.get("layout_name", ""),
                "design_rationale": variant.get("design_rationale", ""),
                "thumbnail_path": png_paths[slide_idx],
                "placeholder_fills": fills,
                "image_placeholder_idx": image_idx,
                "grounding": variant.get("grounding") or {"score": 1.0, "grounded": True, "flagged_idx": []},
            })
            slide_idx += 1
        sections_result.append({
            "section_index": section.get("section_index", 0),
            "heading": section.get("heading", ""),
            "variants": section_variants,
        })

    ctx["all_variants_pptx_path"] = all_pptx_path
    ctx["sections"] = sections_result
    return ctx


# (status, operator-facing message, percent-on-start, step function)
STEPS: list[tuple[str, str, int, Any]] = [
    ("extracting", "Estrazione del contenuto dal PDF...", 10, _step_extract),
    ("planning", "Generazione delle varianti (Claude)... può richiedere fino a 2 minuti.", 30, _step_plan),
    ("grounding", "Verifica che il testo sia fedele alla fonte...", 65, _step_ground),
    ("rendering", "Rendering delle slide in anteprima...", 80, _step_render),
]


async def run_presentation_job(
    job_id: str,
    file_path: str,
    master_path: str,
    master_layouts: dict | None,
    num_variants: int,
    custom_prompt: str | None,
    output_dir: str,
) -> None:
    """Run the full presentations pipeline for one job, persisting progress as it goes."""
    ctx: dict[str, Any] = {
        "file_path": file_path,
        "master_path": master_path,
        "master_layouts": master_layouts,
        "num_variants": num_variants,
        "custom_prompt": custom_prompt,
        "output_dir": output_dir,
    }

    for status, message, percent, step_fn in STEPS:
        db.update_job(job_id, status=status, step=message, percent=percent)
        try:
            ctx = await step_fn(ctx)
        except Exception as exc:
            logger.exception("Job %s failed at step %s", job_id, status)
            db.update_job(job_id, status="failed", step=message, error=str(exc))
            return

    db.update_job(
        job_id,
        status="variants_ready",
        step="Varianti pronte.",
        percent=100,
        data={
            "all_variants_pptx_path": ctx["all_variants_pptx_path"],
            "sections": ctx["sections"],
            "master_path": master_path,
        },
    )
