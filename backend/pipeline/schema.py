"""
Typed schema for the LLM-generated slide plan, plus validation against the
master template's *real* placeholders.

Before this existed, the plan coming back from the LLM was trusted as-is:
a bad ``layout_index`` silently became slide layout 0
(``pptx_service.py`` used to do ``if layout_index >= len(...): layout_index = 0``)
and a placeholder idx that didn't exist on that layout was just skipped
(``KeyError`` caught and ignored). Both failures were invisible to the
operator. Here they become explicit validation errors that get fed back
to the LLM for one repair attempt (see ``pipeline/steps.py``).
"""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ValidationError, field_validator

FillType = Literal["text", "image", "table"]


class Fill(BaseModel):
    type: FillType = "text"
    content: str = ""
    suggestion: str = ""
    rows: list[list[str]] = []
    local_path: Optional[str] = None

    @field_validator("rows", mode="before")
    @classmethod
    def _default_rows(cls, v):
        return v or []


class Variant(BaseModel):
    layout_index: int
    layout_name: str = ""
    placeholder_fills: dict[str, Fill] = {}
    design_rationale: str = ""


class Section(BaseModel):
    section_index: int
    heading: str = ""
    variants: list[Variant] = []


class SlidePlan(BaseModel):
    sections: list[Section]


class PlanParseError(ValueError):
    pass


def parse_plan(raw: object) -> SlidePlan:
    """Parse the LLM's raw (already-json.loads'd) output into a SlidePlan.

    Accepts either a bare list of sections (the shape the prompt asks for)
    or ``{"sections": [...]}``.
    """
    if isinstance(raw, list):
        raw = {"sections": raw}
    if not isinstance(raw, dict):
        raise PlanParseError(f"Expected a JSON array or object, got {type(raw).__name__}")
    try:
        return SlidePlan.model_validate(raw)
    except ValidationError as exc:
        raise PlanParseError(str(exc)) from exc


def validate_plan(plan: SlidePlan, master_layouts: dict | None) -> list[str]:
    """Check the plan against the master template's actual layouts/placeholders.

    Returns a list of human-readable error strings (empty if the plan is
    fully valid). These are meant to be fed back to the LLM verbatim as
    correction instructions.
    """
    errors: list[str] = []
    layouts = (master_layouts or {}).get("layouts", [])
    if not layouts:
        errors.append("No master_layouts available to validate against.")
        return errors

    valid_idx_by_layout: dict[int, set[str]] = {
        layout["index"]: {str(ph["idx"]) for ph in layout.get("placeholders", [])}
        for layout in layouts
    }
    name_by_layout: dict[int, str] = {layout["index"]: layout["name"] for layout in layouts}
    num_layouts = len(layouts)

    for section in plan.sections:
        for v_idx, variant in enumerate(section.variants):
            where = f"section {section.section_index} variant {v_idx}"

            if variant.layout_index < 0 or variant.layout_index >= num_layouts:
                errors.append(
                    f"{where}: layout_index={variant.layout_index} is out of range "
                    f"(master has {num_layouts} layouts, valid indices 0-{num_layouts - 1})."
                )
                continue

            expected_name = name_by_layout[variant.layout_index]
            if variant.layout_name and variant.layout_name != expected_name:
                errors.append(
                    f"{where}: layout_index={variant.layout_index} is named "
                    f"\"{expected_name}\" in the master, not \"{variant.layout_name}\"."
                )

            valid_idx = valid_idx_by_layout[variant.layout_index]
            for idx_str, fill in variant.placeholder_fills.items():
                if idx_str not in valid_idx:
                    errors.append(
                        f"{where}: placeholder idx={idx_str} does not exist on layout "
                        f"\"{expected_name}\" (valid idx: {sorted(valid_idx)})."
                    )
                if fill.type == "text" and not fill.content.strip():
                    errors.append(f"{where}: placeholder idx={idx_str} is type=text but has empty content.")
                if fill.type == "image" and not fill.suggestion.strip():
                    errors.append(f"{where}: placeholder idx={idx_str} is type=image but has no search suggestion.")
                if fill.type == "table" and not fill.rows:
                    errors.append(f"{where}: placeholder idx={idx_str} is type=table but has no rows.")

    return errors
