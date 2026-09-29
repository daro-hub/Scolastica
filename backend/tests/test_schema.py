import pytest

from pipeline.schema import PlanParseError, parse_plan, validate_plan

RAW_VALID = [
    {
        "section_index": 0,
        "heading": "Intro",
        "variants": [
            {
                "layout_index": 0,
                "layout_name": "Title Slide",
                "placeholder_fills": {"0": {"type": "text", "content": "Unit 1"}},
                "design_rationale": "title slide",
            }
        ],
    }
]


def test_parse_plan_accepts_bare_list():
    plan = parse_plan(RAW_VALID)
    assert len(plan.sections) == 1
    assert plan.sections[0].variants[0].layout_index == 0


def test_parse_plan_accepts_wrapped_dict():
    plan = parse_plan({"sections": RAW_VALID})
    assert len(plan.sections) == 1


def test_parse_plan_rejects_garbage():
    with pytest.raises(PlanParseError):
        parse_plan("not a list or dict")


def test_validate_plan_accepts_valid_plan(master_layouts):
    plan = parse_plan(RAW_VALID)
    assert validate_plan(plan, master_layouts) == []


def test_validate_plan_rejects_out_of_range_layout(master_layouts):
    raw = [
        {
            "section_index": 0,
            "variants": [
                {"layout_index": 999, "layout_name": "Nonexistent", "placeholder_fills": {}}
            ],
        }
    ]
    plan = parse_plan(raw)
    errors = validate_plan(plan, master_layouts)
    assert errors
    assert "out of range" in errors[0]


def test_validate_plan_rejects_wrong_placeholder_idx(master_layouts):
    # Layout 0 ("Title Slide") does not have a placeholder idx=99.
    raw = [
        {
            "section_index": 0,
            "variants": [
                {
                    "layout_index": 0,
                    "layout_name": "Title Slide",
                    "placeholder_fills": {"99": {"type": "text", "content": "hi"}},
                }
            ],
        }
    ]
    plan = parse_plan(raw)
    errors = validate_plan(plan, master_layouts)
    assert any("does not exist" in e for e in errors)


def test_validate_plan_rejects_layout_name_mismatch(master_layouts):
    raw = [
        {
            "section_index": 0,
            "variants": [
                {"layout_index": 0, "layout_name": "Totally Wrong Name", "placeholder_fills": {}}
            ],
        }
    ]
    plan = parse_plan(raw)
    errors = validate_plan(plan, master_layouts)
    assert any("is named" in e for e in errors)


def test_validate_plan_rejects_empty_text_fill(master_layouts):
    raw = [
        {
            "section_index": 0,
            "variants": [
                {
                    "layout_index": 0,
                    "layout_name": "Title Slide",
                    "placeholder_fills": {"0": {"type": "text", "content": "   "}},
                }
            ],
        }
    ]
    plan = parse_plan(raw)
    errors = validate_plan(plan, master_layouts)
    assert any("empty content" in e for e in errors)
