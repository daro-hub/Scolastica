"""
File manager utility for handling uploaded files and generated outputs.
Stores files temporarily in memory/disk and provides retrieval.
"""
import os
import uuid
from pathlib import Path

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


def save_output(content: bytes, original_name: str, extension: str) -> dict:
    """
    Save generated output and return metadata.
    """
    output_id = str(uuid.uuid4())
    filename = f'{Path(original_name).stem}_{output_id[:8]}{extension}'
    file_path = OUTPUT_DIR / filename
    file_path.write_bytes(content)
    return {
        'id': output_id,
        'filename': filename,
        'extension': extension,
        'path': str(file_path),
    }


def get_output_path(output_id: str) -> Path | None:
    """
    Find output file by output_id (partial match in filename).
    """
    for f in OUTPUT_DIR.iterdir():
        if output_id[:8] in f.name:
            return f
    return None
