import pytest

from services import pptx_service


def test_analyze_master_finds_expected_layouts(master_pptx_path):
    layouts = pptx_service.analyze_master(master_pptx_path)
    names = {l["name"] for l in layouts["layouts"]}
    assert "Title Slide" in names
    assert "Title and Content" in names

    title_slide = next(l for l in layouts["layouts"] if l["name"] == "Title Slide")
    idxs = {ph["idx"] for ph in title_slide["placeholders"]}
    assert 0 in idxs  # title/center-title placeholder


def test_analyze_master_missing_file_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        pptx_service.analyze_master(str(tmp_path / "nope.pptx"))


def test_extract_content_reads_pages_in_order(sample_pdf_path):
    content = pptx_service.extract_content(sample_pdf_path)
    assert len(content["pages"]) == 1
    text = content["pages"][0]["text"]
    # The three sentences were written top-to-bottom; reading order must
    # preserve that, not jumble them (the whole point of _reading_order_text).
    assert text.index("Sustainable tourism") < text.index("Globalisation increased")
    assert text.index("Globalisation increased") < text.index("Ecotourism aims")
    assert content["full_text"] == text


def test_extract_content_missing_file_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        pptx_service.extract_content(str(tmp_path / "nope.pdf"))
