"""
Gamma API service for presentation generation.
Uses Gamma's Create from Template API to generate presentations.

Gamma works with templates already created on gamma.app (identified by gammaId).
Content from PDF/DOCX files is passed via the prompt parameter.
"""
import os
import asyncio
import httpx

GAMMA_API_KEY = os.getenv('GAMMA_API_KEY', '')
BASE_URL = 'https://public-api.gamma.app/v1.0'


def _headers():
    return {
        'X-API-KEY': GAMMA_API_KEY,
        'Content-Type': 'application/json',
    }


async def create_from_template(
    gamma_id: str,
    prompt: str,
    export_as: str = 'pptx',
) -> bytes:
    """
    Create a new presentation from an existing Gamma template.
    
    Args:
        gamma_id: The Gamma template ID (e.g., 'g_abcdef123456ghi')
        prompt: Content and instructions for generating the presentation
        export_as: Output format ('pptx' or 'pdf')
    
    Returns:
        Generated file as bytes
    """
    payload = {
        'gammaId': gamma_id,
        'prompt': prompt,
        'exportAs': export_as,
    }
    
    print(f"[GAMMA DEBUG] Calling Gamma API with gammaId: {gamma_id}")
    print(f"[GAMMA DEBUG] Prompt length: {len(prompt)} chars")
    print(f"[GAMMA DEBUG] Export as: {export_as}")
    print(f"[GAMMA DEBUG] API Key present: {bool(GAMMA_API_KEY)}")
    
    async with httpx.AsyncClient(timeout=600.0) as client:
        response = await client.post(
            f'{BASE_URL}/generations/from-template',
            headers=_headers(),
            json=payload,
        )
        
        print(f"[GAMMA DEBUG] Response status: {response.status_code}")
        print(f"[GAMMA DEBUG] Response body: {response.text[:500]}")
        
        if response.status_code not in (200, 201):
            error_detail = response.text
            raise Exception(f"Gamma API error {response.status_code}: {error_detail}")
        
        generation_id = response.json().get('generationId')
        if not generation_id:
            raise Exception('No generationId in response')
        
        print(f"[GAMMA DEBUG] Generation ID: {generation_id}")
        
        poll_count = 0
        while True:
            poll_count += 1
            poll_response = await client.get(
                f'{BASE_URL}/generations/{generation_id}',
                headers={'X-API-KEY': GAMMA_API_KEY},
            )
            
            print(f"[GAMMA DEBUG] Poll #{poll_count} - Status code: {poll_response.status_code}")
            print(f"[GAMMA DEBUG] Poll #{poll_count} - Response: {poll_response.text[:300]}")
            
            if poll_response.status_code != 200:
                raise Exception(f"Polling error: {poll_response.text}")
            
            data = poll_response.json()
            status = data.get('status', '')
            
            print(f"[GAMMA DEBUG] Poll #{poll_count} - Generation status: {status}")
            
            if status == 'completed':
                gamma_url = data.get('gammaUrl')
                pptx_url = data.get('pptxUrl') or data.get('exportUrl')
                pdf_url = data.get('pdfUrl')
                
                print(f"[GAMMA DEBUG] Gamma URL: {gamma_url}")
                print(f"[GAMMA DEBUG] PPTX URL: {pptx_url}")
                print(f"[GAMMA DEBUG] PDF URL: {pdf_url}")
                
                download_url = pptx_url if export_as == 'pptx' else pdf_url
                
                if download_url:
                    file_response = await client.get(download_url)
                    file_response.raise_for_status()
                    return file_response.content
                
                raise Exception(f'Generation completed but no download URL. Gamma URL: {gamma_url}')
            
            elif status in ('error', 'failed'):
                raise Exception(f"Generation failed: {data.get('message', 'Unknown error')}")
            
            if poll_count > 60:
                raise Exception(f"Timeout: generation took too long. Last status: {status}")
            
            await asyncio.sleep(3)


async def create_presentation(
    content_text: str,
    gamma_template_id: str,
    additional_instructions: str = '',
    export_as: str = 'pptx',
) -> bytes:
    """
    Generate a presentation from content using a Gamma template.
    
    Args:
        content_text: The text content extracted/provided from source files
        gamma_template_id: The Gamma template ID to use
        additional_instructions: Extra instructions for generation
        export_as: Output format ('pptx' or 'pdf')
    
    Returns:
        File as bytes
    """
    prompt = content_text
    if additional_instructions:
        prompt = f"{additional_instructions}\n\nContent:\n{content_text}"
    
    return await create_from_template(gamma_template_id, prompt, export_as)


async def create_interactive_map(
    content_text: str,
    gamma_template_id: str,
) -> bytes:
    """
    Generate interactive navigation slides with clickable areas.
    
    Returns:
        PPTX file as bytes
    """
    instructions = (
        'Generate interactive navigation slides with clickable areas '
        'linking sections. Include a table of contents slide with hyperlinks '
        'to each section, and navigation buttons on each slide.'
    )
    
    prompt = f"{instructions}\n\nContent:\n{content_text}"
    
    return await create_from_template(gamma_template_id, prompt, 'pptx')


def read_file_content(file_path: str) -> str:
    """
    Read text content from a file (PDF, DOCX, or plain text).
    """
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == '.pdf':
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(file_path)
            text_parts = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)
            return '\n'.join(text_parts)
        except Exception as e:
            return f"[Error reading PDF: {e}]"
    
    elif ext == '.docx':
        try:
            from docx import Document
            doc = Document(file_path)
            text_parts = []
            for para in doc.paragraphs:
                if para.text.strip():
                    text_parts.append(para.text)
            return '\n'.join(text_parts)
        except Exception as e:
            return f"[Error reading DOCX: {e}]"
    
    else:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            return f"[Binary file: {os.path.basename(file_path)}]"
