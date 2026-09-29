"""
Single entry point for text-completion LLM calls: routes to Bedrock
(preferred) or the direct Anthropic API (fallback), with retry on
transient errors. content_service.py's vision calls are a separate path
(image content blocks aren't wired through Bedrock here) and call
Anthropic directly, but still read the model name from config.py.
"""
from __future__ import annotations

import asyncio
import json
import logging

import httpx

from config import (
    ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL,
    BEDROCK_AWS_REGION,
    BEDROCK_MODEL,
    FAKE_LLM,
    USE_BEDROCK,
)

logger = logging.getLogger(__name__)

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"

# Transient errors worth retrying: network hiccups and rate limits/server
# errors. Never retry on a 4xx that means "your request is wrong" (bad
# JSON body, auth failure) since retrying that just burns tokens for the
# same failure.
_RETRYABLE_STATUS = {408, 409, 429, 500, 502, 503, 504}


class LLMError(RuntimeError):
    """Raised when the LLM call fails after retries, or credentials are missing."""


# Tests set this to a callable(prompt: str) -> str for control over the
# exact plan returned. Nothing sets it for a plain `FAKE_LLM=1` run (e2e,
# manual smoke test) — that gets _default_fake_response instead, so
# FAKE_LLM alone is enough to exercise the pipeline without registering
# anything from another process.
_fake_responder = None


def set_fake_responder(fn) -> None:
    global _fake_responder
    _fake_responder = fn


def _default_fake_response(prompt: str) -> str:
    """A minimal, always-schema-valid plan for FAKE_LLM runs with no
    registered responder. layout_index=0 exists on any real master
    (every PPTX has at least one slide layout); leaving layout_name
    empty and placeholder_fills empty skips both checks in
    pipeline/schema.py's validate_plan that would otherwise require
    knowing the specific master's layout names/placeholder idx — this
    function only sees the prompt text, not the master.
    """
    return json.dumps([
        {
            "section_index": 0,
            "heading": "FAKE_LLM placeholder section",
            "variants": [{"layout_index": 0, "layout_name": "", "placeholder_fills": {}}],
        }
    ])


async def call_llm(prompt: str, max_tokens: int = 8192, max_attempts: int = 3) -> str:
    """Call the configured LLM with exponential backoff on transient errors."""
    if FAKE_LLM or _fake_responder is not None:
        if _fake_responder is not None:
            return _fake_responder(prompt)
        return _default_fake_response(prompt)

    if not USE_BEDROCK and not ANTHROPIC_API_KEY:
        raise LLMError(
            "No LLM credentials configured. Set BEDROCK_AWS_ACCESS_KEY_ID + "
            "BEDROCK_AWS_SECRET_ACCESS_KEY (preferred) or ANTHROPIC_API_KEY."
        )

    delay = 1.0
    last_exc: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            if USE_BEDROCK:
                return await asyncio.to_thread(_call_bedrock_sync, prompt, max_tokens)
            return await _call_anthropic_api(prompt, max_tokens)
        except _RetryableLLMError as exc:
            last_exc = exc
            if attempt == max_attempts:
                break
            logger.warning("LLM call failed (attempt %d/%d): %s — retrying in %.1fs", attempt, max_attempts, exc, delay)
            await asyncio.sleep(delay)
            delay *= 2
        except Exception as exc:
            # Non-retryable (bad request, auth, invalid response shape): fail fast.
            raise LLMError(str(exc)) from exc

    raise LLMError(f"LLM call failed after {max_attempts} attempts: {last_exc}") from last_exc


class _RetryableLLMError(RuntimeError):
    pass


def _call_bedrock_sync(prompt: str, max_tokens: int) -> str:
    """Synchronous Bedrock call — run via asyncio.to_thread, never on the event loop."""
    import boto3
    from botocore.config import Config as BotoConfig
    from botocore.exceptions import ClientError, EndpointConnectionError

    boto_config = BotoConfig(read_timeout=300, connect_timeout=10, retries={"max_attempts": 1})
    client = boto3.client(
        "bedrock-runtime",
        region_name=BEDROCK_AWS_REGION,
        config=boto_config,
    )

    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "temperature": 0.1,
        "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}],
    })

    try:
        response = client.invoke_model(
            modelId=BEDROCK_MODEL, contentType="application/json", accept="application/json", body=body,
        )
    except EndpointConnectionError as exc:
        raise _RetryableLLMError(f"Bedrock connection failed: {exc}") from exc
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code in ("ThrottlingException", "ServiceUnavailableException", "InternalServerException"):
            raise _RetryableLLMError(f"Bedrock transient error {code}: {exc}") from exc
        raise RuntimeError(f"Bedrock API call failed: {exc}") from exc

    response_body = json.loads(response["body"].read())
    return response_body["content"][0]["text"]


async def _call_anthropic_api(prompt: str, max_tokens: int) -> str:
    payload = {
        "model": ANTHROPIC_MODEL,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(ANTHROPIC_API_URL, json=payload, headers=headers)
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        if status in _RETRYABLE_STATUS:
            raise _RetryableLLMError(f"Anthropic API returned {status}: {exc.response.text[:300]}") from exc
        raise RuntimeError(f"Anthropic API returned {status}: {exc.response.text[:500]}") from exc
    except httpx.RequestError as exc:
        raise _RetryableLLMError(f"Anthropic API request failed: {exc}") from exc

    response_data = response.json()
    return response_data["content"][0]["text"]
