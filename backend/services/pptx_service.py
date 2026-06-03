"""
PowerPoint generation service.

Replaces the Gamma API approach with a local pipeline:
master analysis → content extraction → variant generation via Claude (Bedrock) → PPTX assembly.
"""

from __future__ import annotations

import json
import os
import tempfile
import uuid
from pathlib import Path
from typing import Any

import fitz
import httpx
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.enum.shapes import MSO_SHAPE_TYPE, PP_PLACEHOLDER


# --- LLM Configuration: Bedrock (primary) or Anthropic API (fallback) ---

BEDROCK_AWS_ACCESS_KEY_ID = os.environ.get("BEDROCK_AWS_ACCESS_KEY_ID", "")
BEDROCK_AWS_SECRET_ACCESS_KEY = os.environ.get("BEDROCK_AWS_SECRET_ACCESS_KEY", "")
BEDROCK_AWS_REGION = os.environ.get("BEDROCK_AWS_REGION", "eu-west-1")
BEDROCK_INFERENCE_PREFIX = os.environ.get("BEDROCK_INFERENCE_PREFIX", "eu")
BEDROCK_MODEL = os.environ.get(
    "BEDROCK_MODEL",
    f"{BEDROCK_INFERENCE_PREFIX}.anthropic.claude-opus-4-6-v1"
)

USE_BEDROCK = bool(BEDROCK_AWS_ACCESS_KEY_ID and BEDROCK_AWS_SECRET_ACCESS_KEY)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = "claude-sonnet-4-20250514"
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"

_PLACEHOLDER_TYPE_MAP = {
    PP_PLACEHOLDER.TITLE: "title",
    PP_PLACEHOLDER.CENTER_TITLE: "title",
    PP_PLACEHOLDER.SUBTITLE: "subtitle",
    PP_PLACEHOLDER.BODY: "body",
    PP_PLACEHOLDER.OBJECT: "body",
    PP_PLACEHOLDER.TABLE: "table",
    PP_PLACEHOLDER.CHART: "chart",
    PP_PLACEHOLDER.BITMAP: "picture",
    PP_PLACEHOLDER.MEDIA_CLIP: "media",
    PP_PLACEHOLDER.ORG_CHART: "chart",
}


def analyze_master(master_pptx_path: str) -> dict:
    """Load a master .pptx template and extract its layout capabilities.

    Args:
        master_pptx_path: Absolute or relative path to the master PPTX file.

    Returns:
        A dict with key ``layouts``, each entry describing the layout name,
        index, and its placeholders (idx, type, dimensions).

    Raises:
        FileNotFoundError: If the template file does not exist.
        ValueError: If the file cannot be parsed as a valid PPTX.
    """
    path = Path(master_pptx_path)
    if not path.exists():
        raise FileNotFoundError(f"Master template not found: {master_pptx_path}")

    try:
        prs = Presentation(str(path))
    except Exception as exc:
        raise ValueError(f"Cannot parse PPTX template: {exc}") from exc

    layouts: list[dict[str, Any]] = []

    for idx, layout in enumerate(prs.slide_layouts):
        placeholders: list[dict[str, Any]] = []

        for ph in layout.placeholders:
            ph_type = _resolve_placeholder_type(ph)
            placeholders.append({
                "idx": ph.placeholder_format.idx,
                "type": ph_type,
                "name": ph.name,
                "width_emu": ph.width,
                "height_emu": ph.height,
                "left_emu": ph.left,
                "top_emu": ph.top,
            })

        layouts.append({
            "index": idx,
            "name": layout.name,
            "placeholders": placeholders,
        })

    return {"layouts": layouts, "slide_count": len(prs.slides)}


def _resolve_placeholder_type(ph) -> str:
    """Map a placeholder object to a human-readable type string."""
    ph_idx_type = ph.placeholder_format.type
    if ph_idx_type in _PLACEHOLDER_TYPE_MAP:
        return _PLACEHOLDER_TYPE_MAP[ph_idx_type]

    name_lower = ph.name.lower()
    if "picture" in name_lower or "image" in name_lower:
        return "picture"
    if "title" in name_lower:
        return "title"
    if "subtitle" in name_lower:
        return "subtitle"
    if "table" in name_lower:
        return "table"
    if "body" in name_lower or "content" in name_lower or "text" in name_lower:
        return "body"

    return "other"


def extract_content(pdf_path: str) -> dict:
    """Extract text, images, and structural information from a PDF.

    Args:
        pdf_path: Path to the source PDF.

    Returns:
        A dict with:
          - ``sections``: list of dicts, each with ``heading``, ``text``, ``page_numbers``
          - ``images``: list of dicts with ``path`` (temp file), ``page``, ``index``
          - ``full_text``: concatenated raw text (fallback)

    Raises:
        FileNotFoundError: If the PDF does not exist.
        RuntimeError: If PyMuPDF cannot open the file.
    """
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    try:
        doc = fitz.open(str(path))
    except Exception as exc:
        raise RuntimeError(f"Cannot open PDF: {exc}") from exc

    sections: list[dict[str, Any]] = []
    images: list[dict[str, Any]] = []
    full_text_parts: list[str] = []
    tmp_dir = tempfile.mkdtemp(prefix="pptx_extract_")

    current_section: dict[str, Any] | None = None

    for page_num in range(len(doc)):
        page = doc[page_num]
        blocks = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)["blocks"]

        for block in blocks:
            if block["type"] == 0:  # text block
                block_text = _extract_block_text(block)
                if not block_text.strip():
                    continue

                full_text_parts.append(block_text)

                if _is_heading(block):
                    if current_section:
                        sections.append(current_section)
                    current_section = {
                        "heading": block_text.strip(),
                        "text": "",
                        "page_numbers": [page_num + 1],
                    }
                elif current_section:
                    current_section["text"] += block_text + "\n"
                    if (page_num + 1) not in current_section["page_numbers"]:
                        current_section["page_numbers"].append(page_num + 1)
                else:
                    current_section = {
                        "heading": "",
                        "text": block_text + "\n",
                        "page_numbers": [page_num + 1],
                    }

            elif block["type"] == 1:  # image block
                img_ext = block.get("ext", "png")
                img_filename = f"img_p{page_num + 1}_{uuid.uuid4().hex[:8]}.{img_ext}"
                img_path = os.path.join(tmp_dir, img_filename)

                try:
                    with open(img_path, "wb") as f:
                        f.write(block["image"])
                    images.append({
                        "path": img_path,
                        "page": page_num + 1,
                        "index": len(images),
                        "width": block.get("width", 0),
                        "height": block.get("height", 0),
                    })
                except (KeyError, IOError):
                    pass

    if current_section:
        sections.append(current_section)

    doc.close()

    return {
        "sections": sections,
        "images": images,
        "full_text": "\n".join(full_text_parts),
        "tmp_dir": tmp_dir,
    }


def _extract_block_text(block: dict) -> str:
    """Concatenate all span texts from a text block."""
    parts: list[str] = []
    for line in block.get("lines", []):
        for span in line.get("spans", []):
            parts.append(span.get("text", ""))
        parts.append("\n")
    return "".join(parts).rstrip("\n")


def _is_heading(block: dict) -> bool:
    """Heuristic: a block is a heading if its font size is notably larger or bold."""
    sizes: list[float] = []
    flags: list[int] = []
    for line in block.get("lines", []):
        for span in line.get("spans", []):
            sizes.append(span.get("size", 12))
            flags.append(span.get("flags", 0))

    if not sizes:
        return False

    avg_size = sum(sizes) / len(sizes)
    is_bold = any(f & 2 ** 4 for f in flags)

    return avg_size >= 16 or is_bold


async def generate_variants(
    content: dict,
    master_layouts: dict | None,
    num_variants: int = 5,
    custom_prompt: str | None = None,
) -> list[dict[str, Any]]:
    """Call Claude to generate variant layout proposals for each content section.

    Each variant specifies which master layout to use, how to fill placeholders,
    and image search suggestions. Text is ONLY cut from the original, never rephrased.

    Args:
        content: Output of ``extract_content``.
        master_layouts: Output of ``analyze_master``, or None for default layouts.
        num_variants: Number of variants per section.
        custom_prompt: Optional additional instructions.

    Returns:
        List of section objects, each containing a ``variants`` list with
        ``num_variants`` entries.

    Raises:
        RuntimeError: If the API call fails.
        EnvironmentError: If neither Bedrock nor Anthropic API credentials are set.
    """
    if not USE_BEDROCK and not ANTHROPIC_API_KEY:
        raise EnvironmentError(
            "No LLM credentials configured. Set BEDROCK_AWS_ACCESS_KEY_ID + "
            "BEDROCK_AWS_SECRET_ACCESS_KEY (preferred) or ANTHROPIC_API_KEY."
        )

    layouts_desc = json.dumps(
        master_layouts["layouts"] if master_layouts else _default_layouts(),
        indent=2, default=str,
    )

    sections_for_prompt: list[dict] = []
    max_sections = 12
    relevant_sections = [
        s for s in content["sections"]
        if len(s.get("text", "").strip()) > 20 or len(s.get("heading", "").strip()) > 10
    ][:max_sections]

    for i, section in enumerate(relevant_sections):
        sections_for_prompt.append({
            "index": i,
            "heading": section["heading"][:200],
            "text": section["text"][:2000],
        })

    user_message = f"""You are a presentation design assistant. Given the following content sections extracted from a PDF and the available PowerPoint master layouts, generate {num_variants} variant proposals for each section.

AVAILABLE LAYOUTS:
{layouts_desc}

CONTENT SECTIONS:
{json.dumps(sections_for_prompt, indent=2, ensure_ascii=False)}

CRITICAL RULES:
- You MUST only use EXACT text fragments cut from the original content. NEVER rewrite, paraphrase, summarize, or rephrase any text.
- If text doesn't fit a placeholder, cut more aggressively. Do NOT reformulate to make it shorter.
- Each variant must specify: layout_index, placeholder_fills (mapping placeholder idx to content), and image_suggestions (Getty search terms).
- Return valid JSON only, no markdown fencing.

OUTPUT FORMAT (JSON):
[
  {{
    "section_index": 0,
    "heading": "...",
    "variants": [
      {{
        "layout_index": 1,
        "layout_name": "...",
        "placeholder_fills": {{
          "0": {{"type": "text", "content": "exact fragment from original"}},
          "1": {{"type": "text", "content": "exact fragment from original"}},
          "10": {{"type": "image", "suggestion": "getty search term"}}
        }},
        "image_suggestions": ["search term 1", "search term 2"],
        "design_rationale": "brief explanation of why this layout works"
      }}
    ]
  }}
]
"""

    if custom_prompt:
        user_message += f"\n\nADDITIONAL INSTRUCTIONS FROM OPERATOR:\n{custom_prompt}"

    assistant_text = await _call_llm(user_message, max_tokens=16384)

    try:
        variants = json.loads(assistant_text)
    except json.JSONDecodeError as exc:
        cleaned = _attempt_json_extraction(assistant_text)
        if cleaned is None:
            raise RuntimeError(
                f"Claude returned invalid JSON. First 500 chars: {assistant_text[:500]}"
            ) from exc
        variants = cleaned

    return variants


async def _call_llm(prompt: str, max_tokens: int = 8192) -> str:
    """Route LLM call to Bedrock (preferred) or Anthropic API (fallback)."""
    if USE_BEDROCK:
        return await _call_bedrock(prompt, max_tokens)
    return await _call_anthropic_api(prompt, max_tokens)


async def _call_bedrock(prompt: str, max_tokens: int) -> str:
    """Call Claude via Amazon Bedrock using boto3."""
    import boto3
    from botocore.config import Config as BotoConfig

    # Re-read env at call time to support hot-reload
    region = os.environ.get("BEDROCK_AWS_REGION", "eu-west-1")
    access_key = os.environ.get("BEDROCK_AWS_ACCESS_KEY_ID", "")
    secret_key = os.environ.get("BEDROCK_AWS_SECRET_ACCESS_KEY", "")
    prefix = os.environ.get("BEDROCK_INFERENCE_PREFIX", "eu")
    model_id = os.environ.get("BEDROCK_MODEL", f"{prefix}.anthropic.claude-sonnet-4-6")

    boto_config = BotoConfig(
        read_timeout=300,
        connect_timeout=10,
        retries={"max_attempts": 1},
    )

    client = boto3.client(
        "bedrock-runtime",
        region_name=region,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=boto_config,
    )

    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "temperature": 0.4,
        "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}],
    })

    try:
        response = client.invoke_model(
            modelId=model_id,
            contentType="application/json",
            accept="application/json",
            body=body,
        )
    except Exception as exc:
        raise RuntimeError(f"Bedrock API call failed: {exc}") from exc

    response_body = json.loads(response["body"].read())
    return response_body["content"][0]["text"]


async def _call_anthropic_api(prompt: str, max_tokens: int) -> str:
    """Call Claude via direct Anthropic API (fallback if Bedrock not configured)."""
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
        raise RuntimeError(
            f"Anthropic API returned {exc.response.status_code}: "
            f"{exc.response.text[:500]}"
        ) from exc
    except httpx.RequestError as exc:
        raise RuntimeError(f"Anthropic API request failed: {exc}") from exc

    response_data = response.json()
    return response_data["content"][0]["text"]


def _default_layouts() -> list[dict]:
    """Fallback layout descriptions when no master template is provided."""
    return [
        {"index": 0, "name": "Title Slide", "placeholders": [
            {"idx": 0, "type": "title"}, {"idx": 1, "type": "subtitle"}
        ]},
        {"index": 1, "name": "Title and Content", "placeholders": [
            {"idx": 0, "type": "title"}, {"idx": 1, "type": "body"}
        ]},
        {"index": 2, "name": "Two Content", "placeholders": [
            {"idx": 0, "type": "title"}, {"idx": 1, "type": "body"}, {"idx": 2, "type": "body"}
        ]},
        {"index": 3, "name": "Title and Picture", "placeholders": [
            {"idx": 0, "type": "title"}, {"idx": 1, "type": "body"}, {"idx": 10, "type": "picture"}
        ]},
        {"index": 4, "name": "Blank with Image", "placeholders": [
            {"idx": 10, "type": "picture"}, {"idx": 1, "type": "body"}
        ]},
    ]


def _attempt_json_extraction(text: str):
    """Try to extract JSON from text that may contain markdown fencing."""
    for start_marker in ("```json", "```"):
        if start_marker in text:
            start = text.index(start_marker) + len(start_marker)
            end = text.find("```", start)
            if end == -1:
                end = len(text)
            try:
                return json.loads(text[start:end].strip())
            except (json.JSONDecodeError, ValueError):
                pass

    for i, ch in enumerate(text):
        if ch == "[":
            try:
                return json.loads(text[i:])
            except json.JSONDecodeError:
                pass
            break

    for i, ch in enumerate(text):
        if ch == "{":
            try:
                return [json.loads(text[i:])]
            except json.JSONDecodeError:
                pass
            break

    return None


def build_pptx(
    master_path: str,
    selected_variants: list[dict[str, Any]],
    images: dict[str, str] | None = None,
    output_path: str | None = None,
) -> str:
    """Assemble the final PPTX from a master template and selected variants.

    Args:
        master_path: Path to the master .pptx template.
        selected_variants: List of variant dicts (one per section), each specifying
            ``layout_index`` and ``placeholder_fills``.
        images: Optional mapping of placeholder idx (as string) to local image path.
            Overrides image suggestions with actual files.
        output_path: Where to save the result. If None, saves to a temp file.

    Returns:
        Absolute path to the generated PPTX file.

    Raises:
        FileNotFoundError: If master template or referenced images don't exist.
        ValueError: If a layout_index references a non-existent layout.
    """
    master = Path(master_path)
    if not master.exists():
        raise FileNotFoundError(f"Master template not found: {master_path}")

    prs = Presentation(str(master))
    images = images or {}

    for variant in selected_variants:
        layout_index = variant.get("layout_index", 0)
        if layout_index >= len(prs.slide_layouts):
            raise ValueError(
                f"Layout index {layout_index} out of range "
                f"(template has {len(prs.slide_layouts)} layouts)"
            )

        layout = prs.slide_layouts[layout_index]
        slide = prs.slides.add_slide(layout)

        fills = variant.get("placeholder_fills", {})
        for idx_str, fill_data in fills.items():
            idx = int(idx_str)
            _apply_fill(slide, idx, fill_data, images)

    if output_path is None:
        output_path = os.path.join(
            tempfile.gettempdir(),
            f"presentation_{uuid.uuid4().hex[:12]}.pptx",
        )

    prs.save(output_path)
    return os.path.abspath(output_path)


def _apply_fill(
    slide,
    placeholder_idx: int,
    fill_data: dict[str, Any],
    images: dict[str, str],
) -> None:
    """Apply a single fill instruction to a slide placeholder."""
    try:
        ph = slide.placeholders[placeholder_idx]
    except KeyError:
        return

    fill_type = fill_data.get("type", "text")
    content = fill_data.get("content", "")

    if fill_type == "text":
        ph.text = content

    elif fill_type == "image":
        img_key = str(placeholder_idx)
        img_path = images.get(img_key) or fill_data.get("local_path")

        if img_path and Path(img_path).exists():
            try:
                ph.insert_picture(open(img_path, "rb"))
            except AttributeError:
                from pptx.util import Inches as _Inches
                left = ph.left
                top = ph.top
                width = ph.width
                height = ph.height
                slide.shapes.add_picture(img_path, left, top, width, height)
        else:
            ph.text = f"[Image: {fill_data.get('suggestion', 'placeholder')}]"

    elif fill_type == "table":
        rows_data = fill_data.get("rows", [])
        if rows_data:
            _insert_table(slide, ph, rows_data)
        else:
            ph.text = content


def _insert_table(slide, placeholder, rows: list[list[str]]) -> None:
    """Insert a table into the slide at the placeholder's position."""
    if not rows:
        return

    num_rows = len(rows)
    num_cols = max(len(row) for row in rows)

    table_shape = slide.shapes.add_table(
        num_rows, num_cols,
        placeholder.left, placeholder.top,
        placeholder.width, placeholder.height,
    )
    table = table_shape.table

    for r_idx, row in enumerate(rows):
        for c_idx, cell_text in enumerate(row):
            if c_idx < num_cols:
                table.cell(r_idx, c_idx).text = str(cell_text)


# --- Approach C: Generate all slides as images for visual selection ---

LIBREOFFICE_PATH = os.environ.get(
    "LIBREOFFICE_PATH",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice"
)


def build_all_variants_pptx(
    master_path: str,
    variants_data: list[dict[str, Any]],
) -> str:
    """Build a single PPTX containing ALL variant slides for visual preview.

    For each section, adds N slides (one per variant), in order.
    Returns path to the temporary PPTX.
    """
    master = Path(master_path)
    if not master.exists():
        raise FileNotFoundError(f"Master template not found: {master_path}")

    prs = Presentation(str(master))

    # Remove any existing slides from the master template
    while len(prs.slides) > 0:
        rId = prs.slides._sldIdLst[0].rId
        prs.part.drop_rel(rId)
        del prs.slides._sldIdLst[0]

    for section in variants_data:
        for variant in section.get("variants", []):
            layout_index = variant.get("layout_index", 0)
            if layout_index >= len(prs.slide_layouts):
                layout_index = 0

            layout = prs.slide_layouts[layout_index]
            slide = prs.slides.add_slide(layout)

            fills = variant.get("placeholder_fills", {})
            for idx_str, fill_data in fills.items():
                _apply_fill(slide, int(idx_str), fill_data, {})

    output_path = os.path.join(
        tempfile.gettempdir(),
        f"all_variants_{uuid.uuid4().hex[:8]}.pptx",
    )
    prs.save(output_path)
    return output_path


def pptx_to_pngs(pptx_path: str, output_dir: str, dpi: int = 150) -> list[str]:
    """Convert a PPTX to individual PNG images per slide.

    Uses LibreOffice headless for PPTX→PDF, then PyMuPDF for PDF→PNG.
    Returns list of PNG file paths in slide order.
    """
    os.makedirs(output_dir, exist_ok=True)

    pdf_path = _pptx_to_pdf(pptx_path, output_dir)

    doc = fitz.open(pdf_path)
    png_paths = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)

        png_filename = f"slide_{page_num:03d}.png"
        png_path = os.path.join(output_dir, png_filename)
        pix.save(png_path)
        png_paths.append(png_path)

    doc.close()
    os.remove(pdf_path)
    return png_paths


def _pptx_to_pdf(pptx_path: str, output_dir: str) -> str:
    """Convert PPTX to PDF using LibreOffice headless."""
    import subprocess

    soffice = LIBREOFFICE_PATH
    if not Path(soffice).exists():
        raise RuntimeError(
            f"LibreOffice not found at {soffice}. "
            "Install LibreOffice or set LIBREOFFICE_PATH."
        )

    result = subprocess.run(
        [
            soffice,
            "--headless",
            "--convert-to", "pdf",
            "--outdir", output_dir,
            pptx_path,
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"LibreOffice conversion failed: {result.stderr[:500]}"
        )

    pdf_name = Path(pptx_path).stem + ".pdf"
    pdf_path = os.path.join(output_dir, pdf_name)

    if not Path(pdf_path).exists():
        existing = [f for f in os.listdir(output_dir) if f.endswith('.pdf')]
        if existing:
            pdf_path = os.path.join(output_dir, existing[0])
        else:
            raise RuntimeError("LibreOffice did not produce a PDF file")

    return pdf_path


async def generate_variants_with_thumbnails(
    content: dict,
    master_path: str,
    master_layouts: dict | None,
    num_variants: int = 2,
    custom_prompt: str | None = None,
    output_dir: str | None = None,
) -> dict[str, Any]:
    """Full pipeline: generate variants via Claude, build all slides, render to PNG.

    Returns a dict with:
    - generation_pptx_path: path to PPTX with all variant slides
    - sections: list of section dicts with thumbnail paths
    """
    variants_data = await generate_variants(
        content=content,
        master_layouts=master_layouts,
        num_variants=num_variants,
        custom_prompt=custom_prompt,
    )

    all_pptx_path = build_all_variants_pptx(master_path, variants_data)

    if output_dir is None:
        output_dir = os.path.join(tempfile.gettempdir(), f"thumbs_{uuid.uuid4().hex[:8]}")

    png_paths = pptx_to_pngs(all_pptx_path, output_dir)

    sections_result = []
    slide_idx = 0

    for section in variants_data:
        section_variants = []
        for v_idx, variant in enumerate(section.get("variants", [])):
            if slide_idx < len(png_paths):
                section_variants.append({
                    "variant_index": v_idx,
                    "slide_index": slide_idx,
                    "layout_index": variant.get("layout_index", 0),
                    "layout_name": variant.get("layout_name", ""),
                    "design_rationale": variant.get("design_rationale", ""),
                    "thumbnail_path": png_paths[slide_idx],
                })
                slide_idx += 1

        sections_result.append({
            "section_index": section.get("section_index", 0),
            "heading": section.get("heading", ""),
            "variants": section_variants,
        })

    return {
        "generation_pptx_path": all_pptx_path,
        "sections": sections_result,
    }


def build_final_from_selections(
    all_variants_pptx_path: str,
    selections: dict[int, int],
    sections_data: list[dict],
    output_path: str | None = None,
) -> str:
    """Build final PPTX by extracting only selected slides from the all-variants PPTX.

    Args:
        all_variants_pptx_path: Path to PPTX with all variant slides.
        selections: Mapping section_index -> variant_index (which variant was chosen).
        sections_data: The sections list from generate_variants_with_thumbnails.
        output_path: Where to save. If None, uses a temp file.

    Returns:
        Path to the final PPTX.
    """
    from copy import deepcopy
    from pptx.opc.constants import RELATIONSHIP_TYPE as RT

    prs = Presentation(all_variants_pptx_path)

    selected_slide_indices = set()
    for section in sections_data:
        s_idx = section["section_index"]
        chosen_v = selections.get(s_idx, 0)
        for variant in section["variants"]:
            if variant["variant_index"] == chosen_v:
                selected_slide_indices.add(variant["slide_index"])
                break

    slides_to_remove = []
    for i in range(len(prs.slides)):
        if i not in selected_slide_indices:
            slides_to_remove.append(i)

    for idx in sorted(slides_to_remove, reverse=True):
        rId = prs.slides._sldIdLst[idx].rId
        prs.part.drop_rel(rId)
        del prs.slides._sldIdLst[idx]

    if output_path is None:
        output_path = os.path.join(
            tempfile.gettempdir(),
            f"final_{uuid.uuid4().hex[:8]}.pptx",
        )

    prs.save(output_path)
    return output_path
