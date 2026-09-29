import pytest

import db


def test_create_and_get_project_roundtrip():
    project_id = db.create_project("Test Project", "/tmp/master.pptx", {"layouts": []})
    project = db.get_project(project_id)
    assert project["name"] == "Test Project"
    assert project["master_path"] == "/tmp/master.pptx"
    assert project["master_layouts"] == {"layouts": []}


def test_get_project_missing_returns_none():
    assert db.get_project("does-not-exist") is None


def test_job_lifecycle_and_progress():
    job_id = db.create_job(None, "presentations")
    job = db.get_job(job_id)
    assert job["status"] == "queued"
    assert job["percent"] == 0

    db.update_job(job_id, status="planning", step="Generazione...", percent=30)
    job = db.get_job(job_id)
    assert job["status"] == "planning"
    assert job["step"] == "Generazione..."
    assert job["percent"] == 30

    db.update_job(job_id, data={"foo": "bar"})
    job = db.get_job(job_id)
    assert job["data"]["foo"] == "bar"

    # merge_data=True (default) preserves earlier keys
    db.update_job(job_id, data={"baz": "qux"})
    job = db.get_job(job_id)
    assert job["data"] == {"foo": "bar", "baz": "qux"}


def test_variants_ready_is_not_terminal_and_can_move_to_completed():
    job_id = db.create_job(None, "presentations")
    db.update_job(job_id, status="variants_ready", percent=100)
    db.update_job(job_id, status="completed", data={"output_id": "abc"})
    job = db.get_job(job_id)
    assert job["status"] == "completed"


def test_completed_job_is_terminal_and_rejects_further_transitions():
    job_id = db.create_job(None, "presentations")
    db.update_job(job_id, status="completed")
    with pytest.raises(ValueError):
        db.update_job(job_id, status="planning")


def test_update_missing_job_raises_keyerror():
    with pytest.raises(KeyError):
        db.update_job("does-not-exist", status="failed")
