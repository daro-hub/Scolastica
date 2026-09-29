"""
File manager utility for handling uploaded files and generated outputs.
Stores files temporarily in memory/disk and provides retrieval.
"""
from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Optional

UPLOAD_DIR = Path(__file__).parent.parent / 'uploads'
OUTPUT_DIR = Path(__file__).parent.parent / 'outputs'

UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)


def save_upload(file_bytes: bytes, original_filename: str) -> str:
    """
    Save uploaded file to disk and return a unique file_id.
    """
    file_id = str(uuid.uuid4())
    ext = Path(original_filename).suffix
    file_path = UPLOAD_DIR / f'{file_id}{ext}'
    file_path.write_bytes(file_bytes)
    return file_id


def get_upload_path(file_id: str) -> Path | None:
    """
    Find the uploaded file by file_id (checks all extensions).
    """
    for f in UPLOAD_DIR.iterdir():
        if f.stem == file_id:
            return f
    return None


def save_output(content: bytes | str, original_name: str, extension: str) -> dict:
    """
    Save generated output and return metadata.

    The on-disk filename is prefixed with the FULL output_id (not the
    first 8 hex chars): get_output_path used to match on `output_id[:8]
    in f.name`, a substring match that could return the wrong file if two
    ids shared their first 8 characters (a real, if unlikely, collision
    with uuid4's ~4 billion 8-hex-char space once there are enough files).
    Matching on the full id via startswith() is exact.
    """
    output_id = str(uuid.uuid4())
    display_name = f'{Path(original_name).stem}{extension}'
    # "__" delimiter: output_id is a full uuid4, so matching on the exact
    # "{output_id}__" prefix in get_output_path can't collide between
    # two different outputs, while still keeping a human-readable
    # filename after it for the download's Content-Disposition name.
    filename = f'{output_id}__{display_name}'
    file_path = OUTPUT_DIR / filename
    if isinstance(content, str):
        file_path.write_text(content, encoding='utf-8')
    else:
        file_path.write_bytes(content)
    return {
        'id': output_id,
        'filename': display_name,
        'extension': extension,
        'path': str(file_path),
    }


def get_output_path(output_id: str) -> Path | None:
    """
    Find output file by its exact output_id prefix (see save_output).
    """
    prefix = f'{output_id}__'
    for f in OUTPUT_DIR.iterdir():
        if f.name.startswith(prefix):
            return f
    return None


def get_output_display_name(output_id: str, file_path: Path) -> str:
    """Recover the human-readable filename for a Content-Disposition header."""
    prefix = f'{output_id}__'
    if file_path.name.startswith(prefix):
        return file_path.name[len(prefix):]
    return file_path.name
