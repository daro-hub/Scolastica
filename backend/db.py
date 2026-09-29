"""
SQLite-backed persistence for projects and generation jobs.

Before this existed, both lived in plain in-memory dicts
(``_project_cache``, ``_generation_cache`` in main.py): a Railway restart
mid-generation silently lost the job, and the README's claim of a
Supabase-backed ``scolastica_generations`` table was aspirational, not
real. SQLite on a local/volume-mounted file is enough for this project's
scale (one operator at a time) without pulling in a hosted Postgres
dependency the deploy doesn't otherwise need.
"""
from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from config import DB_PATH

_lock = threading.Lock()
_conn: Optional[sqlite3.Connection] = None

_SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT,
    master_path TEXT,
    master_layouts TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    task_type TEXT NOT NULL,
    status TEXT NOT NULL,
    step TEXT,
    percent INTEGER DEFAULT 0,
    data TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"""

# Once a job reaches one of these, it's done for good — enforced below so
# a bug elsewhere can't silently resurrect a finished/failed job (e.g. a
# stray update landing after "failed" was already set). "variants_ready"
# is NOT terminal: it's a paused state waiting on the operator's
# selection, and legitimately moves on to "building"/"completed"/"failed".
_TERMINAL_STATUSES = {"completed", "failed"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_conn(db_path: str | None = None) -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(db_path or DB_PATH, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.executescript(_SCHEMA)
        _conn.commit()
    return _conn


def reset_conn_for_tests(db_path: str) -> sqlite3.Connection:
    """Used by pytest to point at a throwaway file/in-memory DB per test."""
    global _conn
    _conn = None
    return get_conn(db_path)


# --- Projects ---

def create_project(name: str, master_path: str | None, master_layouts: dict | None) -> str:
    project_id = str(uuid.uuid4())
    conn = get_conn()
    with _lock:
        conn.execute(
            "INSERT INTO projects (id, name, master_path, master_layouts, created_at) VALUES (?, ?, ?, ?, ?)",
            (project_id, name, master_path, json.dumps(master_layouts) if master_layouts else None, _now()),
        )
        conn.commit()
    return project_id


def get_project(project_id: str) -> Optional[dict[str, Any]]:
    conn = get_conn()
    row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if row is None:
        return None
    d = dict(row)
    d["master_layouts"] = json.loads(d["master_layouts"]) if d["master_layouts"] else None
    return d


# --- Jobs ---

def create_job(project_id: str | None, task_type: str) -> str:
    job_id = str(uuid.uuid4())
    conn = get_conn()
    now = _now()
    with _lock:
        conn.execute(
            "INSERT INTO jobs (id, project_id, task_type, status, step, percent, data, error, created_at, updated_at) "
            "VALUES (?, ?, ?, 'queued', 'In coda...', 0, '{}', NULL, ?, ?)",
            (job_id, project_id, task_type, now, now),
        )
        conn.commit()
    return job_id


def update_job(
    job_id: str,
    status: str | None = None,
    step: str | None = None,
    percent: int | None = None,
    data: dict | None = None,
    error: str | None = None,
    merge_data: bool = True,
) -> None:
    conn = get_conn()
    with _lock:
        row = conn.execute("SELECT status, data FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if row is None:
            raise KeyError(f"job {job_id} not found")

        current_status = row["status"]
        if current_status in _TERMINAL_STATUSES and status is not None and status != current_status:
            raise ValueError(f"job {job_id} is already terminal ({current_status}), cannot move to {status}")

        new_data = json.loads(row["data"] or "{}")
        if data is not None:
            if merge_data:
                new_data.update(data)
            else:
                new_data = data

        fields, values = [], []
        if status is not None:
            fields.append("status = ?")
            values.append(status)
        if step is not None:
            fields.append("step = ?")
            values.append(step)
        if percent is not None:
            fields.append("percent = ?")
            values.append(percent)
        if data is not None:
            fields.append("data = ?")
            values.append(json.dumps(new_data))
        if error is not None:
            fields.append("error = ?")
            values.append(error)
        fields.append("updated_at = ?")
        values.append(_now())
        values.append(job_id)

        conn.execute(f"UPDATE jobs SET {', '.join(fields)} WHERE id = ?", values)
        conn.commit()


def get_job(job_id: str) -> Optional[dict[str, Any]]:
    conn = get_conn()
    row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    if row is None:
        return None
    d = dict(row)
    d["data"] = json.loads(d["data"] or "{}")
    return d
