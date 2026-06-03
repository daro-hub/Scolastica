"""
Scolastica Backend - FastAPI application for content creator workflows.

V2 endpoints (variant-based workflow):
- POST /v2/projects: Create a project with master template
- POST /v2/projects/{project_id}/generate: Start generation with variants
- GET /v2/generations/{generation_id}: Poll generation status
- POST /v2/generations/{generation_id}/select: Submit variant selections
- POST /v2/generations/{generation_id}/build: Build final output
- GET /v2/images/search: Search images (Getty/Unsplash)

Legacy endpoints (preserved for backward compat):
- POST /upload
- POST /process
- GET /download/{result_id}
"""
import os
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

load_dotenv()

from utils.file_manager import (
    save_upload,
    get_upload_path,
    save_output,
    get_output_path,
)
from services import assemblyai_service, gamma_service, content_service, map_service

app = FastAPI(
    title='Scolastica API',
    description='Content creator workflow automation with AI-powered variant generation',
    version='2.0.0',
)

APP_PASSWORD = os.environ.get('APP_PASSWORD', '')
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')


@app.middleware("http")
async def check_password(request, call_next):
    """Simple password protection via X-App-Password header or ?password= query param."""
    if not APP_PASSWORD:
        return await call_next(request)

    path = request.url.path
    public_paths = ('/health', '/docs', '/openapi.json')
    static_prefixes = ('/_next/', '/static-assets/')
    static_extensions = ('.html', '.js', '.css', '.png', '.svg', '.ico', '.txt', '.json', '.woff', '.woff2')

    if path in public_paths:
        return await call_next(request)
    if any(path.startswith(p) for p in static_prefixes):
        return await call_next(request)
    if any(path.endswith(ext) for ext in static_extensions):
        return await call_next(request)
    if path == '/' or path == '':
        return await call_next(request)

    password = (
        request.headers.get('x-app-password')
        or request.query_params.get('password')
    )

    if password != APP_PASSWORD:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=401,
            content={'detail': 'Password richiesta. Invia header X-App-Password o query param ?password='},
        )

    return await call_next(request)

_generation_cache: dict = {}
_project_cache: dict = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.pptx', '.mp3', '.wav', '.mp4'}
AUDIO_VIDEO_EXTENSIONS = {'.mp3', '.wav', '.mp4'}
DOCUMENT_EXTENSIONS = {'.pdf', '.docx', '.pptx'}
MAX_UPLOAD_SIZE_MB = 50
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024


# --- V2 Models ---

class CreateProjectRequest(BaseModel):
    name: str
    master_file_id: Optional[str] = None


class GenerateRequest(BaseModel):
    task_type: str
    source_file_ids: List[str]
    custom_prompt: Optional[str] = None
    num_variants: int = 5


class SelectVariantsRequest(BaseModel):
    selections: dict  # {section_index: variant_index}


class BuildRequest(BaseModel):
    image_selections: Optional[dict] = None  # {section_index: image_id}


class ImageSearchRequest(BaseModel):
    query: str
    page: int = 1
    page_size: int = 20


# --- V2 Endpoints ---

@app.post('/v2/projects')
async def create_project(request: CreateProjectRequest):
    """Create a new project, optionally with a master template."""
    from services import pptx_service

    project_id = str(__import__('uuid').uuid4())
    master_layouts = None

    if request.master_file_id:
        master_path = get_upload_path(request.master_file_id)
        if not master_path:
            raise HTTPException(status_code=404, detail='Master file not found')
        master_layouts = pptx_service.analyze_master(str(master_path))

    _project_cache[project_id] = {
        'master_path': str(master_path) if request.master_file_id else None,
        'master_layouts': master_layouts,
    }

    return {
        'project_id': project_id,
        'name': request.name,
        'master_layouts': master_layouts,
    }


@app.post('/v2/projects/{project_id}/generate')
async def start_generation(project_id: str, request: GenerateRequest):
    """Start variant generation for a project."""
    from services import pptx_service

    file_paths = []
    for file_id in request.source_file_ids:
        file_path = get_upload_path(file_id)
        if not file_path:
            raise HTTPException(status_code=404, detail=f'File {file_id} not found')
        file_paths.append(str(file_path))

    generation_id = str(__import__('uuid').uuid4())

    if request.task_type == 'presentations':
        try:
            content = pptx_service.extract_content(file_paths[0])
            master_path = _project_cache.get(project_id, {}).get('master_path')
            master_layouts = _project_cache.get(project_id, {}).get('master_layouts')

            if not master_path:
                return {
                    'generation_id': generation_id,
                    'status': 'failed',
                    'error': 'Nessun template master caricato. Torna indietro e carica un file .pptx.',
                }

            output_dir = os.path.join(
                Path(__file__).parent / 'outputs',
                f'thumbs_{generation_id[:8]}',
            )

            result = await pptx_service.generate_variants_with_thumbnails(
                content=content,
                master_path=master_path,
                master_layouts=master_layouts,
                num_variants=request.num_variants,
                custom_prompt=request.custom_prompt,
                output_dir=output_dir,
            )

            sections_with_urls = []
            for section in result['sections']:
                variants_with_urls = []
                for v in section['variants']:
                    thumb_filename = Path(v['thumbnail_path']).name
                    thumb_id = f"thumbs_{generation_id[:8]}/{thumb_filename}"
                    variants_with_urls.append({
                        'variant_index': v['variant_index'],
                        'slide_index': v['slide_index'],
                        'layout_name': v['layout_name'],
                        'design_rationale': v['design_rationale'],
                        'thumbnail_url': f'/thumbnails/{generation_id[:8]}/{thumb_filename}',
                    })
                sections_with_urls.append({
                    'section_index': section['section_index'],
                    'heading': section['heading'],
                    'variants': variants_with_urls,
                })

            _generation_cache[generation_id] = {
                'all_variants_pptx_path': result['generation_pptx_path'],
                'sections': result['sections'],
                'master_path': master_path,
            }

            return {
                'generation_id': generation_id,
                'status': 'variants_ready',
                'sections': sections_with_urls,
            }
        except Exception as e:
            return {
                'generation_id': generation_id,
                'status': 'failed',
                'error': str(e),
            }

    elif request.task_type in ('subtitles', 'karaoke'):
        try:
            if request.task_type == 'subtitles':
                result = await assemblyai_service.create_subtitles(file_paths[0])
            else:
                result = await assemblyai_service.create_karaoke(file_paths[0])

            output = save_output(result, Path(file_paths[0]).name, '.srt')
            return {
                'generation_id': generation_id,
                'status': 'completed',
                'output': output,
            }
        except Exception as e:
            return {
                'generation_id': generation_id,
                'status': 'failed',
                'error': str(e),
            }

    elif request.task_type in ('quiz', 'padlet', 'thinglink'):
        try:
            if request.task_type == 'quiz':
                result = await content_service.generate_quiz(file_paths)
            elif request.task_type == 'padlet':
                result = await content_service.generate_padlet(file_paths)
            else:
                result = await content_service.generate_thinglink(file_paths)

            output = save_output(result, Path(file_paths[0]).name, '.html')
            return {
                'generation_id': generation_id,
                'status': 'completed',
                'output': output,
            }
        except Exception as e:
            return {
                'generation_id': generation_id,
                'status': 'failed',
                'error': str(e),
            }

    else:
        raise HTTPException(status_code=400, detail=f'Unknown task type: {request.task_type}')


@app.post('/v2/generations/{generation_id}/build')
async def build_final(generation_id: str, request: BuildRequest):
    """Build the final PPTX containing only the selected variant slides."""
    from services import pptx_service

    if generation_id not in _generation_cache:
        raise HTTPException(status_code=404, detail='Generation not found. Please regenerate.')

    cached = _generation_cache[generation_id]
    all_pptx = cached.get('all_variants_pptx_path')
    sections_data = cached.get('sections', [])

    if not all_pptx:
        raise HTTPException(status_code=400, detail='No variant PPTX available.')

    selections = {}
    if request.image_selections:
        for k, v in request.image_selections.items():
            selections[int(k)] = int(v)
    else:
        for section in sections_data:
            selections[section['section_index']] = 0

    try:
        output_path = pptx_service.build_final_from_selections(
            all_variants_pptx_path=all_pptx,
            selections=selections,
            sections_data=sections_data,
        )
        output = save_output(
            open(output_path, 'rb').read(),
            f"scolastica_{generation_id[:8]}",
            '.pptx'
        )
        return {
            'generation_id': generation_id,
            'status': 'completed',
            'output_url': f'/download/{output["id"]}',
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/v2/images/search')
async def search_images(query: str, page: int = 1, page_size: int = 20):
    """Search for images (Getty if configured, Unsplash fallback)."""
    from services import getty_service

    try:
        results = await getty_service.search_images(query, page=page, page_size=page_size)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Legacy Endpoints (V1) ---

class ProcessRequest(BaseModel):
    task_type: str
    file_ids: List[str]
    gamma_template_id: Optional[str] = None
    export_format: Optional[str] = None
    custom_prompt: Optional[str] = None


class OutputInfo(BaseModel):
    id: str
    filename: str
    extension: str


class ProcessResponse(BaseModel):
    task_type: str
    outputs: List[OutputInfo]


@app.post('/upload')
async def upload_files(files: List[UploadFile] = File(...)):
    """Upload one or more files. Returns list of file_ids for later processing."""
    file_ids = []

    for file in files:
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f'File type {ext} not allowed. Allowed: {ALLOWED_EXTENSIONS}',
            )

        content = await file.read()
        if len(content) > MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f'File troppo grande. Massimo {MAX_UPLOAD_SIZE_MB} MB.',
            )

        file_id = save_upload(content, file.filename)
        file_ids.append(file_id)

    return {'file_ids': file_ids, 'count': len(file_ids)}


@app.post('/process', response_model=ProcessResponse)
async def process_files(request: ProcessRequest):
    """Process uploaded files with the selected task (legacy V1 endpoint)."""
    task = request.task_type
    file_ids = request.file_ids

    if not file_ids:
        raise HTTPException(status_code=400, detail='No files provided')

    outputs = []
    file_paths = []
    for file_id in file_ids:
        file_path = get_upload_path(file_id)
        if not file_path:
            raise HTTPException(status_code=404, detail=f'File {file_id} not found')
        file_paths.append(file_path)

    try:
        if task in ('quiz', 'padlet', 'thinglink'):
            for file_path in file_paths:
                ext = file_path.suffix.lower()
                if ext not in DOCUMENT_EXTENSIONS:
                    raise HTTPException(
                        status_code=400,
                        detail=f'{task.capitalize()} task requires document files, got {ext}',
                    )

            file_path_strs = [str(fp) for fp in file_paths]

            if task == 'quiz':
                content = await content_service.generate_quiz(file_path_strs)
            elif task == 'padlet':
                content = await content_service.generate_padlet(file_path_strs)
            else:
                content = await content_service.generate_thinglink(file_path_strs)

            output = save_output(content, file_paths[0].name, '.html')
            outputs.append(OutputInfo(
                id=output['id'],
                filename=output['filename'],
                extension=output['extension'],
            ))

        else:
            for file_path in file_paths:
                ext = file_path.suffix.lower()

                if task == 'subtitles':
                    if ext not in AUDIO_VIDEO_EXTENSIONS:
                        raise HTTPException(
                            status_code=400,
                            detail=f'Subtitles task requires audio/video file, got {ext}',
                        )
                    content = await assemblyai_service.create_subtitles(str(file_path))
                    output = save_output(content, file_path.name, '.srt')

                elif task == 'karaoke':
                    if ext not in AUDIO_VIDEO_EXTENSIONS:
                        raise HTTPException(
                            status_code=400,
                            detail=f'Karaoke task requires audio/video file, got {ext}',
                        )
                    content = await assemblyai_service.create_karaoke(str(file_path))
                    output = save_output(content, file_path.name, '.srt')

                elif task == 'presentations':
                    if ext not in DOCUMENT_EXTENSIONS:
                        raise HTTPException(
                            status_code=400,
                            detail=f'Presentations task requires document file, got {ext}',
                        )
                    if not request.gamma_template_id:
                        raise HTTPException(
                            status_code=400,
                            detail='Gamma Template ID is required for presentations',
                        )

                    content_texts = []
                    for fpath in file_paths:
                        if fpath.suffix.lower() in {'.pdf', '.docx', '.txt'}:
                            text = gamma_service.read_file_content(str(fpath))
                            content_texts.append(f"--- {fpath.name} ---\n{text}")

                    combined_content = '\n\n'.join(content_texts)
                    content = await gamma_service.create_presentation(
                        combined_content,
                        request.gamma_template_id,
                        export_as=request.export_format or 'pptx',
                    )
                    out_ext = f'.{request.export_format}' if request.export_format else '.pptx'
                    output = save_output(content, file_path.name, out_ext)
                    outputs.append(OutputInfo(
                        id=output['id'],
                        filename=output['filename'],
                        extension=output['extension'],
                    ))
                    break

                elif task == 'maps':
                    if ext not in DOCUMENT_EXTENSIONS:
                        raise HTTPException(
                            status_code=400,
                            detail=f'Maps task requires document file, got {ext}',
                        )
                    if not request.gamma_template_id:
                        raise HTTPException(
                            status_code=400,
                            detail='Gamma Template ID is required for interactive maps',
                        )

                    content_texts = []
                    for fpath in file_paths:
                        if fpath.suffix.lower() in {'.pdf', '.docx', '.txt'}:
                            text = gamma_service.read_file_content(str(fpath))
                            content_texts.append(f"--- {fpath.name} ---\n{text}")

                    combined_content = '\n\n'.join(content_texts)
                    map_instructions = '''Create an INTERACTIVE MAP presentation with clickable index cards and back buttons.'''
                    gamma_pptx = await gamma_service.create_presentation(
                        combined_content,
                        request.gamma_template_id,
                        map_instructions,
                        export_as=request.export_format or 'pptx',
                    )
                    enhanced_pptx = await map_service.create_interactive_map_pptx(
                        gamma_pptx,
                        combined_content,
                    )
                    out_ext = f'.{request.export_format}' if request.export_format else '.pptx'
                    output = save_output(enhanced_pptx, file_path.name, out_ext)
                    outputs.append(OutputInfo(
                        id=output['id'],
                        filename=output['filename'],
                        extension=output['extension'],
                    ))
                    break

                else:
                    raise HTTPException(status_code=400, detail=f'Unknown task: {task}')

                if task in ('subtitles', 'karaoke'):
                    outputs.append(OutputInfo(
                        id=output['id'],
                        filename=output['filename'],
                        extension=output['extension'],
                    ))

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return ProcessResponse(task_type=task, outputs=outputs)


@app.get('/download/{result_id}')
async def download_result(result_id: str, ext: str = ''):
    """Download a generated output file by its ID."""
    file_path = get_output_path(result_id)

    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail='Result not found')

    media_types = {
        '.srt': 'application/x-subrip',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.pdf': 'application/pdf',
        '.html': 'text/html',
        '.md': 'text/markdown',
    }

    file_ext = file_path.suffix.lower()
    media_type = media_types.get(file_ext, 'application/octet-stream')

    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type=media_type,
    )


@app.get('/thumbnails/{gen_id}/{filename}')
async def serve_thumbnail(gen_id: str, filename: str):
    """Serve a generated slide thumbnail PNG."""
    thumb_path = Path(__file__).parent / 'outputs' / f'thumbs_{gen_id}' / filename

    if not thumb_path.exists():
        raise HTTPException(status_code=404, detail='Thumbnail not found')

    return FileResponse(
        path=str(thumb_path),
        filename=filename,
        media_type='image/png',
    )


@app.get('/health')
async def health_check():
    """Health check endpoint."""
    return {'status': 'ok', 'version': '2.0.0'}


# --- Static frontend serving (for production Docker deploy) ---

STATIC_DIR = Path(__file__).parent / 'static'

if STATIC_DIR.exists():
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import HTMLResponse

    @app.get('/_next/{path:path}')
    async def serve_next_static(path: str):
        file_path = STATIC_DIR / '_next' / path
        if file_path.exists():
            return FileResponse(str(file_path))
        raise HTTPException(status_code=404)

    app.mount('/static-assets', StaticFiles(directory=str(STATIC_DIR)), name='static-frontend')

    @app.get('/{path:path}')
    async def serve_frontend(path: str):
        """Serve the static Next.js frontend. Falls back to index.html for SPA routing."""
        if path and (STATIC_DIR / path).exists():
            return FileResponse(str(STATIC_DIR / path))
        if path and (STATIC_DIR / f'{path}.html').exists():
            return FileResponse(str(STATIC_DIR / f'{path}.html'))
        index_file = STATIC_DIR / 'index.html'
        if index_file.exists():
            return HTMLResponse(index_file.read_text())
        raise HTTPException(status_code=404, detail='Frontend not found')
