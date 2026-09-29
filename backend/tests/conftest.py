"""
Shared fixtures. No personal file paths, no network calls, no real LLM
credentials — everything the tests need is generated on the fly:

- a master .pptx built from python-pptx's own default template (it
  already ships "Title Slide", "Title and Content" and a real picture
  placeholder on "Picture with Caption" — exactly the shapes the
  pipeline needs to validate against)
- a tiny synthetic PDF built with PyMuPDF
- a fake LLM responder so pipeline tests never touch Bedrock/Anthropic
"""
from __future__ import annotations

import sys
from pathlib import Path

import fitz
import pytest
from pptx import Presentation

sys.path.insert(0, str(Path(__file__).parent.parent))

import db as db_module  # noqa: E402
from services import pptx_service  # noqa: E402


@pytest.fixture
def master_pptx_path(tmp_path) -> str:
    prs = Presentation()  # python-pptx's bundled default template
    path = tmp_path / "master.pptx"
    prs.save(str(path))
    return str(path)


@pytest.fixture
def master_layouts(master_pptx_path) -> dict:
    return pptx_service.analyze_master(master_pptx_path)


SAMPLE_SENTENCES = [
    "Sustainable tourism protects natural and cultural resources for future generations.",
    "Globalisation increased the number of people who can afford to travel abroad.",
    "Ecotourism aims to minimise the impact of visitors on fragile environments.",
]


@pytest.fixture
def sample_pdf_path(tmp_path) -> str:
    doc = fitz.open()
    page = doc.new_page()
    y = 72
    for sentence in SAMPLE_SENTENCES:
        page.insert_text((72, y), sentence, fontsize=12)
        y += 20
    path = tmp_path / "source.pdf"
    doc.save(str(path))
    doc.close()
    return str(path)


@pytest.fixture
def sample_source_text() -> str:
    return " ".join(SAMPLE_SENTENCES)


@pytest.fixture(autouse=True)
def _isolated_db(tmp_path, monkeypatch):
    """Every test gets its own throwaway SQLite file instead of touching
    backend/data/scolastica.db."""
    db_path = str(tmp_path / "test.db")
    db_module.reset_conn_for_tests(db_path)
    yield
    db_module.reset_conn_for_tests(db_path)


@pytest.fixture(autouse=True)
def _no_real_llm(monkeypatch):
    """Belt-and-suspenders: force FAKE_LLM on so a test that forgets to
    register a fake responder fails loudly instead of hitting the network."""
    import config
    monkeypatch.setattr(config, "FAKE_LLM", True)
    import llm
    monkeypatch.setattr(llm, "FAKE_LLM", True)
    yield
    llm.set_fake_responder(None)
