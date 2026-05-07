"""
Content generation service for text-based outputs (Quiz, Padlet, ThingLink).
Uses Claude (Anthropic) for AI-powered content generation from uploaded files.

Converts PDF pages to images and sends them to Claude for analysis.
Outputs styled HTML files that open formatted in any browser.
"""
import os
import base64
import httpx
from pathlib import Path

ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')
ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1'

HTML_TEMPLATE = '''<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
        }}
        .container {{
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }}
        .header {{
            background: {header_color};
            color: white;
            padding: 2rem;
            text-align: center;
        }}
        .header h1 {{
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }}
        .header .subtitle {{
            opacity: 0.9;
            font-size: 1rem;
        }}
        .content {{
            padding: 2rem;
        }}
        h2 {{
            color: {accent_color};
            border-bottom: 3px solid {accent_color};
            padding-bottom: 0.5rem;
            margin: 2rem 0 1rem 0;
        }}
        h2:first-child {{
            margin-top: 0;
        }}
        h3 {{
            color: #555;
            margin: 1.5rem 0 0.75rem 0;
        }}
        p {{
            margin-bottom: 1rem;
        }}
        ul, ol {{
            margin: 1rem 0 1rem 1.5rem;
        }}
        li {{
            margin-bottom: 0.5rem;
        }}
        .card {{
            background: #f8f9fa;
            border-radius: 12px;
            padding: 1.5rem;
            margin: 1rem 0;
            border-left: 4px solid {accent_color};
        }}
        .card h3 {{
            margin-top: 0;
            color: {accent_color};
        }}
        .question {{
            background: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 1.25rem;
            margin: 1rem 0;
        }}
        .question-number {{
            display: inline-block;
            background: {accent_color};
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            text-align: center;
            line-height: 28px;
            font-weight: bold;
            margin-right: 0.75rem;
        }}
        .options {{
            margin-top: 1rem;
            padding-left: 2.5rem;
        }}
        .option {{
            padding: 0.5rem 0.75rem;
            margin: 0.25rem 0;
            border-radius: 6px;
            transition: background 0.2s ease;
        }}
        .option.correct {{
            background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
            border: 1px solid #10b981;
            color: #065f46;
            font-weight: 500;
        }}
        .answer-key {{
            background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
            border-radius: 12px;
            padding: 1.5rem;
            margin-top: 2rem;
        }}
        .answer-key h2 {{
            color: #2e7d32;
            border-color: #2e7d32;
        }}
        .hotspot {{
            background: linear-gradient(135deg, #fff 0%, #f5f5f5 100%);
            border-radius: 12px;
            padding: 1.5rem;
            margin: 1.5rem 0;
            border: 1px solid #e0e0e0;
            position: relative;
        }}
        .hotspot::before {{
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            background: {accent_color};
            border-radius: 4px 0 0 4px;
        }}
        .hotspot h3 {{
            color: {accent_color};
            margin-top: 0;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }}
        .hotspot h3::before {{
            content: '📍';
        }}
        .media-suggestion {{
            background: #fff3e0;
            border-radius: 8px;
            padding: 0.75rem 1rem;
            margin-top: 1rem;
            font-size: 0.9rem;
            color: #e65100;
        }}
        .media-suggestion::before {{
            content: '🎬 ';
        }}
        .exercise {{
            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
            border-radius: 12px;
            padding: 1.5rem;
            margin: 1rem 0;
        }}
        .exercise h3 {{
            color: #1565c0;
            margin-top: 0;
        }}
        .resource {{
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem;
            background: #fafafa;
            border-radius: 8px;
            margin: 0.5rem 0;
        }}
        .resource::before {{
            content: '📚';
            font-size: 1.5rem;
        }}
        .footer {{
            text-align: center;
            padding: 1.5rem;
            background: #f5f5f5;
            color: #888;
            font-size: 0.85rem;
        }}
        @media print {{
            body {{
                background: white;
                padding: 0;
            }}
            .container {{
                box-shadow: none;
            }}
        }}
        @media (max-width: 600px) {{
            body {{
                padding: 1rem;
            }}
            .header, .content {{
                padding: 1.5rem;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{icon} {title}</h1>
            <div class="subtitle">Generato automaticamente dal documento caricato</div>
        </div>
        <div class="content">
            {content}
        </div>
        <div class="footer">
            Generato con Scolastica &bull; Powered by AI
        </div>
    </div>
</body>
</html>'''


async def _extract_text_from_file(file_path: str) -> str:
    """Extract text content from DOCX or TXT files. PDFs are sent directly to OpenAI."""
    ext = Path(file_path).suffix.lower()
    
    if ext == '.docx':
        try:
            from docx import Document
            doc = Document(file_path)
            text = '\n'.join([para.text for para in doc.paragraphs])
            return text.strip()
        except ImportError:
            raise Exception('python-docx not installed. Run: pip install python-docx')
    
    elif ext == '.txt':
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read().strip()
    
    else:
        return ''


def _encode_file_to_base64(file_path: str) -> str:
    """Encode a file to base64 string."""
    with open(file_path, 'rb') as f:
        return base64.standard_b64encode(f.read()).decode('utf-8')


def _get_mime_type(file_path: str) -> str:
    """Get MIME type based on file extension."""
    ext = Path(file_path).suffix.lower()
    mime_types = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
    }
    return mime_types.get(ext, 'application/octet-stream')


def _convert_pdf_to_images(file_path: str) -> list[str]:
    """Convert PDF pages to base64 PNG images for Claude Vision."""
    import fitz
    
    doc = fitz.open(file_path)
    images = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        # Render at 150 DPI for good quality without being too large
        mat = fitz.Matrix(150/72, 150/72)
        pix = page.get_pixmap(matrix=mat)
        
        # Convert to PNG bytes
        png_bytes = pix.tobytes("png")
        
        # Encode to base64
        b64_image = base64.standard_b64encode(png_bytes).decode('utf-8')
        images.append(b64_image)
    
    doc.close()
    return images


async def _generate_content_claude(file_paths: list[str], prompt: str) -> str:
    """Use Claude API to generate HTML content, converting PDFs to images for vision."""
    if not ANTHROPIC_API_KEY:
        raise Exception('ANTHROPIC_API_KEY not configured. Add it to your .env file.')
    
    headers = {
        'x-api-key': ANTHROPIC_API_KEY,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
    }
    
    system_prompt = """You are an expert educational content creator.
Generate high-quality educational materials based on the provided documents.
Always respond in the same language as the source document.
Output ONLY the HTML content (no full document, just the inner content, no markdown code blocks).
Use semantic HTML tags: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>.
Use the CSS classes provided in the instructions for styling.
Read ALL pages of ALL documents carefully before generating content.
Each image is a page from a PDF document."""
    
    # Build content array with files
    content = []
    
    # Process files - convert PDFs to images
    for file_path in file_paths:
        ext = Path(file_path).suffix.lower()
        filename = Path(file_path).name
        
        if ext == '.pdf':
            # Add filename indicator
            content.append({
                'type': 'text',
                'text': f'--- Document: {filename} ---'
            })
            
            # Convert PDF pages to images
            page_images = _convert_pdf_to_images(file_path)
            for i, b64_image in enumerate(page_images):
                content.append({
                    'type': 'image',
                    'source': {
                        'type': 'base64',
                        'media_type': 'image/png',
                        'data': b64_image
                    }
                })
                
        elif ext in ['.png', '.jpg', '.jpeg', '.gif', '.webp']:
            # Send image as base64
            file_data = _encode_file_to_base64(file_path)
            mime_type = _get_mime_type(file_path)
            content.append({
                'type': 'text',
                'text': f'--- Document: {filename} ---'
            })
            content.append({
                'type': 'image',
                'source': {
                    'type': 'base64',
                    'media_type': mime_type,
                    'data': file_data
                }
            })
        else:
            # For text-based files, extract and include as text
            text = await _extract_text_from_file(file_path)
            if text:
                content.append({
                    'type': 'text',
                    'text': f'--- Document: {filename} ---\n{text}\n---'
                })
    
    # Add the prompt
    content.append({
        'type': 'text',
        'text': prompt
    })
    
    payload = {
        'model': 'claude-sonnet-4-20250514',
        'max_tokens': 8000,
        'system': system_prompt,
        'messages': [
            {'role': 'user', 'content': content},
        ],
    }
    
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                f'{ANTHROPIC_BASE_URL}/messages',
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            result = data['content'][0]['text']
            
            # Clean up markdown code blocks if present
            result = result.strip()
            if result.startswith('```html'):
                result = result[7:]
            elif result.startswith('```'):
                result = result[3:]
            if result.endswith('```'):
                result = result[:-3]
            
            return result.strip()
    except httpx.HTTPStatusError as e:
        error_detail = e.response.text if e.response else str(e)
        raise Exception(f'Claude API error: {error_detail}')
    except Exception as e:
        raise Exception(f'Error generating content: {str(e)}')


def _wrap_html(content: str, title: str, icon: str, header_color: str, accent_color: str) -> bytes:
    """Wrap content in the HTML template."""
    html = HTML_TEMPLATE.format(
        title=title,
        icon=icon,
        header_color=header_color,
        accent_color=accent_color,
        content=content
    )
    return html.encode('utf-8')


async def generate_quiz(file_paths: list[str]) -> bytes:
    """Generate quiz content from uploaded files. Returns HTML as bytes."""
    
    prompt = """You are processing educational exercise documents. The user has uploaded files that typically include:
1. An EXERCISES file (often titled "Testo esercizi", "Ejercicios", "Exercises") - contains the actual exercises/questions that students need to solve. This is the PRIMARY source - extract exercises ONLY from this file.
2. A SOLUTIONS file (often titled "Soluzione", "Soluciones", "Solutions", "Libro del profesor") - contains answers/solutions. Use this ONLY to find the correct answers.

STEP-BY-STEP PROCESS:
1. IDENTIFY the exercises file by looking for: exercise numbers, blank spaces to fill, questions without answers, student worksheet format
2. IDENTIFY the solutions file by looking for: "Libro del profesor", answer keys, completed answers, teacher's guide format
3. EXTRACT exercises ONLY from the exercises file - read it page by page, exercise by exercise
4. For EACH exercise found, SEARCH the solutions file for the matching answer (by page number, exercise number, or section)
5. If the exercises file appears to be a scanned image, read it carefully using OCR/vision capabilities

CRITICAL RULES:
- Extract exercises ONLY from the EXERCISES file, NOT from the solutions file
- The solutions file is ONLY for finding answers, not for finding exercises
- Keep the ORIGINAL LANGUAGE (Spanish, Italian, etc.) - DO NOT translate anything
- Preserve the EXACT wording of questions and options as they appear
- If you cannot read the exercises file clearly, say "No se pudo leer el archivo de ejercicios"

SUPPORTED EXERCISE TYPES (use appropriate HTML structure):

1. FILL IN THE BLANKS (Completa las frases):
<div class="question">
    <span class="question-number">1</span>
    <strong>Completa las frases:</strong>
    <p>a. El español tiene seis _______ principales.</p>
    <p>b. El castellano evolucionó hasta convertirse en _______.</p>
    <div class="options">
        <div class="option correct">✓ Respuestas: a. dialectos b. español moderno</div>
    </div>
</div>

2. MATCHING (Relaciona):
<div class="question">
    <span class="question-number">2</span>
    <strong>Relaciona los dialectos romances con las correspondientes zonas geográficas españolas:</strong>
    <p>1. Gallego  2. Catalán  3. Castellano  4. Aragonés  5. Leonés  6. Mozárabe</p>
    <p>a. Centro  b. Noroeste  c. Noreste  d. Sur  e. Este  f. Norte</p>
    <div class="options">
        <div class="option correct">✓ Solución: 1-c, 2-e, 3-a, 4-f, 5-b, 6-d</div>
    </div>
</div>

3. OPEN QUESTIONS (Contesta/Explica):
<div class="question">
    <span class="question-number">1</span>
    <strong>¿Cuáles son las principales lenguas cooficiales de España?</strong>
    <div class="options">
        <div class="option correct">✓ Las lenguas cooficiales son: el catalán, el gallego y el vasco.</div>
    </div>
</div>

4. TRUE/FALSE:
<div class="question">
    <span class="question-number">1</span>
    <strong>[Statement]</strong>
    <div class="options">
        <div class="option correct">✓ Verdadero</div>
        <div class="option">Falso</div>
    </div>
</div>

5. MULTIPLE CHOICE:
<div class="question">
    <span class="question-number">1</span>
    <strong>[Question]</strong>
    <div class="options">
        <div class="option"><strong>a.</strong> [option]</div>
        <div class="option correct"><strong>b.</strong> ✓ [correct option]</div>
        <div class="option"><strong>c.</strong> [option]</div>
    </div>
</div>

ORGANIZATION:
- Group exercises by section/page as they appear in the EXERCISES file
- Use <h2> tags for section headers (e.g., "Tomo 1 p. 15 - Actividades")
- The correct answer MUST have class="option correct" and start with ✓

OUTPUT ONLY RAW HTML - no markdown, no code blocks, no explanations."""
    
    content = await _generate_content_claude(file_paths, prompt)
    return _wrap_html(content, 'Quiz', '📝', '#6366f1', '#6366f1')


async def generate_padlet(file_paths: list[str]) -> bytes:
    """Generate Padlet-style content from uploaded files. Returns HTML as bytes."""
    
    prompt = """Generate educational content suitable for a Padlet board based on these documents.

OUTPUT FORMAT (use these exact HTML structures):

<h2>Riepilogo</h2>
<div class="card">
    <p>[Summary paragraph here]</p>
</div>

<h2>Concetti Chiave</h2>
For each concept (3-5 total):
<div class="card">
    <h3>[Concept Title]</h3>
    <p>[Brief explanation]</p>
</div>

<h2>Risorse per Approfondire</h2>
For each resource (2-3 total):
<div class="resource">
    <div>
        <strong>[Topic/Area]</strong>
        <p>[Why this is useful for further learning]</p>
    </div>
</div>

<h2>Esercizi Pratici</h2>
For each exercise (2 total):
<div class="exercise">
    <h3>Esercizio [N]: [Title]</h3>
    <p>[Instructions and description]</p>
</div>"""
    
    content = await _generate_content_claude(file_paths, prompt)
    return _wrap_html(content, 'Padlet', '📌', '#ec4899', '#ec4899')


async def generate_thinglink(file_paths: list[str]) -> bytes:
    """Generate ThingLink-style interactive content from uploaded files. Returns HTML as bytes."""
    
    prompt = """Generate structured content for interactive ThingLink hotspots based on these documents.

OUTPUT FORMAT (use these exact HTML structures):

For each key concept (5-7 total), create a hotspot:
<div class="hotspot">
    <h3>[Short Title - 2-5 words]</h3>
    <p><strong>Descrizione:</strong> [Brief explanation - 1-2 sentences]</p>
    <p><strong>Approfondimento:</strong> [More detailed information - 1 paragraph]</p>
    <div class="media-suggestion">[Suggested image/video type that would enhance this concept]</div>
</div>

Create 5-7 hotspots covering the main topics from the documents."""
    
    content = await _generate_content_claude(file_paths, prompt)
    return _wrap_html(content, 'ThingLink', '🎯', '#14b8a6', '#14b8a6')
