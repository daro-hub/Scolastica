from pptx import Presentation
from PIL import Image

from services import pptx_service


def _variants_data():
    """Two sections, two variants each, on the default template's
    layout 0 ("Title Slide") and layout 8 ("Picture with Caption")."""
    return [
        {
            "section_index": 0,
            "heading": "Intro",
            "variants": [
                {
                    "layout_index": 0,
                    "layout_name": "Title Slide",
                    "placeholder_fills": {"0": {"type": "text", "content": "Variant A"}},
                },
                {
                    "layout_index": 0,
                    "layout_name": "Title Slide",
                    "placeholder_fills": {"0": {"type": "text", "content": "Variant B"}},
                },
            ],
        },
        {
            "section_index": 1,
            "heading": "With picture",
            "variants": [
                {
                    "layout_index": 8,
                    "layout_name": "Picture with Caption",
                    "placeholder_fills": {
                        "0": {"type": "text", "content": "Photo slide"},
                        "1": {"type": "image", "suggestion": "mountains"},
                    },
                },
            ],
        },
    ]


def test_build_all_variants_pptx_creates_one_slide_per_variant(master_pptx_path):
    all_pptx = pptx_service.build_all_variants_pptx(master_pptx_path, _variants_data())
    prs = Presentation(all_pptx)
    assert len(prs.slides) == 3  # 2 variants for section 0 + 1 for section 1


def _sections_result_for_build(all_pptx_path):
    """Mimic pipeline/steps.py's _step_render output shape."""
    return [
        {
            "section_index": 0,
            "variants": [
                {"variant_index": 0, "slide_index": 0, "image_placeholder_idx": None},
                {"variant_index": 1, "slide_index": 1, "image_placeholder_idx": None},
            ],
        },
        {
            "section_index": 1,
            "variants": [
                {"variant_index": 0, "slide_index": 2, "image_placeholder_idx": 1},
            ],
        },
    ]


def test_build_final_keeps_only_selected_slides(master_pptx_path):
    all_pptx = pptx_service.build_all_variants_pptx(master_pptx_path, _variants_data())
    sections_data = _sections_result_for_build(all_pptx)

    final_path = pptx_service.build_final_from_selections(
        all_variants_pptx_path=all_pptx,
        selections={0: 1, 1: 0},  # section 0 -> variant B, section 1 -> its only variant
        sections_data=sections_data,
    )
    prs = Presentation(final_path)
    assert len(prs.slides) == 2
    title_text = prs.slides[0].placeholders[0].text
    assert title_text == "Variant B"


def test_build_final_inserts_selected_image(master_pptx_path, tmp_path):
    all_pptx = pptx_service.build_all_variants_pptx(master_pptx_path, _variants_data())
    sections_data = _sections_result_for_build(all_pptx)

    img_path = tmp_path / "pic.png"
    Image.new("RGB", (40, 30), color="red").save(img_path)

    final_path = pptx_service.build_final_from_selections(
        all_variants_pptx_path=all_pptx,
        selections={0: 0, 1: 0},
        sections_data=sections_data,
        image_selections={"1:1": str(img_path)},
    )
    prs = Presentation(final_path)
    picture_slide = prs.slides[1]  # section 0's variant kept slide 0, section 1's slide follows
    picture_ph = picture_slide.placeholders[1]
    # python-pptx's PicturePlaceholder keeps reporting shape_type ==
    # PLACEHOLDER even once filled (it's a "placeholder with a picture in
    # it", not a generic Picture shape) — the actual signal that the
    # insert worked is that .image now points at real image bytes.
    assert picture_ph.image.size == (40, 30)
