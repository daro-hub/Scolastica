"""
Single source of truth for env-based settings.

Before this module existed, the model name was set in three different
places (a module-level default in pptx_service.py, a different default
baked into the function signature that called it, and a third hardcoded
string in the Anthropic fallback path) and they had drifted out of sync.
Every LLM call in the backend should read its model name from here.
"""
from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# --- LLM: Amazon Bedrock (preferred) or direct Anthropic API (fallback) ---

BEDROCK_AWS_ACCESS_KEY_ID = os.environ.get("BEDROCK_AWS_ACCESS_KEY_ID", "")
BEDROCK_AWS_SECRET_ACCESS_KEY = os.environ.get("BEDROCK_AWS_SECRET_ACCESS_KEY", "")
BEDROCK_AWS_REGION = os.environ.get("BEDROCK_AWS_REGION", "eu-west-1")
BEDROCK_INFERENCE_PREFIX = os.environ.get("BEDROCK_INFERENCE_PREFIX", "eu")
BEDROCK_MODEL = os.environ.get(
    "BEDROCK_MODEL", f"{BEDROCK_INFERENCE_PREFIX}.anthropic.claude-opus-4-6-v1"
)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
# Used both as the direct-Anthropic-API fallback model and as the model
# content_service's vision calls use (Bedrock vision routing is out of
# scope here) — one name, one env var, instead of a hardcoded literal.
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6")

USE_BEDROCK = bool(BEDROCK_AWS_ACCESS_KEY_ID and BEDROCK_AWS_SECRET_ACCESS_KEY)

# --- Testing / CI: skip real network calls to Bedrock/Anthropic entirely ---
# Set by tests and by the e2e Playwright suite so the pipeline runs against
# a scripted fake plan instead of requiring live credentials.
FAKE_LLM = os.environ.get("FAKE_LLM", "").lower() in ("1", "true", "yes")

# --- App auth / CORS ---
APP_PASSWORD = os.environ.get("APP_PASSWORD", "")
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()]

# --- Images ---
GETTY_API_KEY = os.environ.get("GETTY_API_KEY", "")
GETTY_ACCESS_TOKEN = os.environ.get("GETTY_ACCESS_TOKEN", "")
UNSPLASH_ACCESS_KEY = os.environ.get("UNSPLASH_ACCESS_KEY", "")

# --- Storage ---
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = os.environ.get("SCOLASTICA_DB_PATH", str(DATA_DIR / "scolastica.db"))

# --- Grounding ---
# Fraction of a variant's text fills that must overlap with the source PDF
# (by word 4-gram) for the variant to be considered grounded. Below this,
# the UI flags it so the operator knows the model may have invented text
# instead of lifting it from the source.
GROUNDING_THRESHOLD = float(os.environ.get("GROUNDING_THRESHOLD", "0.5"))

LIBREOFFICE_PATH = os.environ.get(
    "LIBREOFFICE_PATH", "/Applications/LibreOffice.app/Contents/MacOS/soffice"
)
