"""
Grounding check: the README promises the operator that slide text is
"lifted from the source, never invented", but nothing in the code used
to verify that — it relied entirely on the prompt telling the model to
behave. This scores each text fill against the source PDF text by word
4-gram overlap, so a hallucinated sentence gets flagged instead of
silently shipping to the operator as if it were a direct excerpt.

This is a real (if simple) heuristic, not a proxy for correctness: a
paraphrase that keeps the same *words* in a different order scores low,
and a short heading can score 0 by design (see the length guard below).
It's meant to catch the failure mode that matters most here — invented
facts/numbers/claims that don't appear anywhere in the source — not to
grade writing quality.
"""
from __future__ import annotations

import re
from typing import Any

_WORD_RE = re.compile(r"[a-zà-ÿ0-9]+", re.IGNORECASE)


def _tokens(text: str) -> list[str]:
    return _WORD_RE.findall(text.lower())


def _ngrams(tokens: list[str], n: int) -> set[tuple[str, ...]]:
    if len(tokens) < n:
        return set()
    return {tuple(tokens[i : i + n]) for i in range(len(tokens) - n + 1)}


# Fills shorter than this many words are usually headings/labels the
# operator wrote themselves as a slide title, not lifted prose — scoring
# them against 4-grams would unfairly flag every short heading as
# "ungrounded". They're treated as trivially grounded instead.
MIN_WORDS_FOR_CHECK = 6


def grounding_score(text: str, source_text: str, n: int = 4) -> float:
    """Fraction of `text`'s word n-grams that also appear in `source_text`.

    Returns 1.0 for empty or very short text (nothing to hallucinate) and
    1.0 if the source itself is empty (no baseline to check against —
    fail open rather than flagging everything).
    """
    tokens = _tokens(text)
    if len(tokens) < MIN_WORDS_FOR_CHECK:
        return 1.0

    source_tokens = _tokens(source_text)
    if not source_tokens:
        return 1.0

    text_ngrams = _ngrams(tokens, n)
    if not text_ngrams:
        return 1.0

    source_ngrams = _ngrams(source_tokens, n)
    overlap = len(text_ngrams & source_ngrams)
    return overlap / len(text_ngrams)


def annotate_grounding(
    sections_data: list[dict[str, Any]],
    source_text: str,
    threshold: float,
) -> None:
    """Mutate sections_data in place, adding a "grounding" dict to each variant:

    {"score": float, "grounded": bool, "flagged_idx": [placeholder idx, ...]}

    `sections_data` is the plain-dict shape produced by
    generate_variants_with_thumbnails (already merged with thumbnail paths),
    not the pydantic SlidePlan — this runs after rendering, on the data
    that gets cached and sent to the frontend.
    """
    for section in sections_data:
        for variant in section.get("variants", []):
            fills = variant.get("placeholder_fills", {})
            text_fills = {
                idx: f.get("content", "")
                for idx, f in fills.items()
                if f.get("type") == "text"
            }
            if not text_fills:
                variant["grounding"] = {"score": 1.0, "grounded": True, "flagged_idx": []}
                continue

            scores = {idx: grounding_score(content, source_text) for idx, content in text_fills.items()}
            flagged = [idx for idx, s in scores.items() if s < threshold]
            overall = min(scores.values()) if scores else 1.0
            variant["grounding"] = {
                "score": round(overall, 3),
                "grounded": not flagged,
                "flagged_idx": flagged,
            }
