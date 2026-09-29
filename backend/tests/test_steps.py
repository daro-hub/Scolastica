import json

import llm
import db
from pipeline import steps

VALID_PLAN = [
    {
        "section_index": 0,
        "heading": "Intro",
        "variants": [
            {
                "layout_index": 0,
                "layout_name": "Title Slide",
                "placeholder_fills": {
                    "0": {"type": "text", "content": "Sustainable tourism protects natural and cultural resources."}
                },
                "design_rationale": "opening slide",
            }
        ],
    }
]

INVALID_PLAN = [
    {
        "section_index": 0,
        "variants": [
            {"layout_index": 0, "layout_name": "Title Slide", "placeholder_fills": {"99": {"type": "text", "content": "bad idx"}}}
        ],
    }
]


async def test_call_llm_default_fake_response_is_schema_valid(master_layouts):
    # No set_fake_responder() call here — plain FAKE_LLM must still
    # produce a validate_plan-clean result on its own, since that's what
    # the e2e suite (a separate process, can't register a Python
    # callable) relies on.
    raw = await llm.call_llm("irrelevant prompt")
    plan = steps.parse_plan(json.loads(raw))
    assert steps.validate_plan(plan, master_layouts) == []


async def test_step_extract_populates_content(sample_pdf_path):
    ctx = {"file_path": sample_pdf_path}
    ctx = await steps._step_extract(ctx)
    assert "Sustainable tourism" in ctx["content"]["full_text"]


async def test_step_plan_accepts_first_valid_response(master_layouts):
    llm.set_fake_responder(lambda prompt: json.dumps(VALID_PLAN))
    ctx = {
        "content": {"pages": [{"page": 1, "text": "some source text"}]},
        "master_layouts": master_layouts,
        "num_variants": 1,
        "custom_prompt": None,
    }
    ctx = await steps._step_plan(ctx)
    assert ctx["plan"].sections[0].variants[0].layout_index == 0


async def test_step_plan_repairs_after_one_invalid_response(master_layouts):
    calls = {"n": 0}

    def fake(prompt: str) -> str:
        calls["n"] += 1
        if calls["n"] == 1:
            return json.dumps(INVALID_PLAN)
        assert "YOUR PREVIOUS ANSWER WAS INVALID" in prompt
        return json.dumps(VALID_PLAN)

    llm.set_fake_responder(fake)
    ctx = {
        "content": {"pages": [{"page": 1, "text": "some source text"}]},
        "master_layouts": master_layouts,
        "num_variants": 1,
        "custom_prompt": None,
    }
    ctx = await steps._step_plan(ctx)
    assert calls["n"] == 2
    assert ctx["plan"].sections[0].variants[0].placeholder_fills.get("0") is not None


async def test_step_plan_gives_up_after_max_repair_attempts(master_layouts):
    llm.set_fake_responder(lambda prompt: json.dumps(INVALID_PLAN))
    ctx = {
        "content": {"pages": [{"page": 1, "text": "some source text"}]},
        "master_layouts": master_layouts,
        "num_variants": 1,
        "custom_prompt": None,
    }
    try:
        await steps._step_plan(ctx)
        assert False, "expected PipelineError"
    except steps.PipelineError as exc:
        assert "does not exist on layout" in str(exc)


async def test_step_ground_annotates_variants(sample_source_text):
    plan = steps.parse_plan(VALID_PLAN)
    ctx = {"plan": plan, "content": {"full_text": sample_source_text}}
    ctx = await steps._step_ground(ctx)
    assert ctx["plan_dicts"][0]["variants"][0]["grounding"]["grounded"] is True


async def test_run_presentation_job_end_to_end(master_pptx_path, master_layouts, sample_pdf_path, tmp_path, monkeypatch):
    llm.set_fake_responder(lambda prompt: json.dumps(VALID_PLAN))

    # Skip the LibreOffice-dependent render step's PDF conversion — this
    # test is about the job/state-machine wiring, not the rendering
    # toolchain (which needs LibreOffice installed to run at all).
    monkeypatch.setattr("services.pptx_service.pptx_to_pngs", lambda p, o, dpi=150: [str(tmp_path / "slide_000.png")])

    job_id = db.create_job(None, "presentations")
    await steps.run_presentation_job(
        job_id=job_id,
        file_path=sample_pdf_path,
        master_path=master_pptx_path,
        master_layouts=master_layouts,
        num_variants=1,
        custom_prompt=None,
        output_dir=str(tmp_path),
    )

    job = db.get_job(job_id)
    assert job["status"] == "variants_ready"
    assert job["percent"] == 100
    assert job["data"]["sections"][0]["variants"][0]["grounding"]["grounded"] is True
