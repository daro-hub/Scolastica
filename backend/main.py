"""
Scolastica Backend - FastAPI application for content creator workflows.

V2 endpoints (job-based workflow, backed by SQLite via db.py):
- POST   /v2/projects                              Create a project, optionally with a master template
- POST   /v2/projects/{project_id}/generate         Start a generation job (returns immediately, 202-style)
- GET    /v2/generations/{generation_id}            Poll job status/progress; sections once variants_ready
- POST   /v2/generations/{generation_id}/build      Build final output from the operator's selections
- GET    /v2/images/search                          Search images (Unsplash; Getty if configured)

Generic:
- POST /upload
- GET  /download/{result_id}
- GET  /thumbnails/{gen_id}/{filename}
- GET  /health

The legacy v1 /process endpoint and the Gamma/interactive-map services it
depended on have been removed — presentations, quizzes, subtitles and
similar are only produced through the v2 job pipeline now.
"""
import asyncio
import logging
import tempfile
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from pydantic import BaseModel

load_dotenv()

import db
import pipeline.steps as pipeline_steps
from config import ALLOWED_ORIGINS, APP_PASSWORD
from utils.file_manager import (
    save_upload,
    get_upload_path,
    save_output,
    get_output_path,
    get_output_display_name,
)
from services import assemblyai_service, content_service, getty_service, pptx_service

logger = logging.getLogger(__name__)

app = FastAPI(
    title='Scolastica API',
    description='Content creator workflow automation with AI-powered variant generation',
    version='2.0.0',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Only these path prefixes require the app password. Everything else
# (static frontend assets, /download/, /thumbnails/) is reachable
# without it: the SPA's own JS has to load before it can even show the
# password prompt, and <img>/<a> browser-native requests can't attach a
# custom header, so /thumbnails/ and /download/ rely on their ids being
# unguessable UUIDs rather than the password. This used to be done the
# other way around — bypass the password for anything ending in a
# static-looking extension — which is fragile (an API path that happened
# to end in ".json" would have slipped through) and inverted the safe
# default. Enumerating the few protected prefixes instead is smaller and
# fails closed for anything new added to /v2/.
PROTECTED_PREFIXES = ('/v2/', '/upload', '/auth/check')
PUBLIC_EXACT_PATHS = ('/health', '/docs', '/openapi.json')


@app.middleware("http")
async def check_password(request, call_next):
    """App-level password gate via the X-App-Password header only.

    A ?password= query param used to also be accepted, which meant the
    password could end up logged in server/proxy access logs. Header-only.
    """
    if not APP_PASSWORD:
        return await call_next(request)

    path = request.url.path
    if path in PUBLIC_EXACT_PATHS:
        return await call_next(request)
    if not any(path.startswith(p) for p in PROTECTED_PREFIXES):
        return await call_next(request)

    password = request.headers.get('x-app-password')
    if password != APP_PASSWORD:
        return JSONResponse(
            status_code=401,
            content={'detail': 'Password richiesta. Invia l\'header X-App-Password.'},
        )
    return await call_next(request)


ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.pptx', '.mp3', '.wav', '.mp4'}
AUDIO_VIDEO_EXTENSIONS = {'.mp3', '.wav', '.mp4'}
DOCUMENT_EXTENSIONS = {'.pdf', '.docx', '.pptx'}
MAX_UPLOAD_SIZE_MB = 50
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

SIMPLE_TASK_TYPES = {'subtitles', 'karaoke', 'quiz', 'padlet', 'thinglink'}
OUTPUT_DIR = Path(__file__).parent / 'outputs'


# --- V2 Models ---

class CreateProjectRequest(BaseModel):
    name: str
    master_file_id: Optional[str] = None


class GenerateRequest(BaseModel):
    task_type: str
    source_file_ids: list[str]
    custom_prompt: Optional[str] = None
    num_variants: int = 5


class BuildRequest(BaseModel):
    variant_selections: Optional[dict[str, int]] = None
    # "{section_index}:{placeholder_idx}" -> image URL (from /v2/images/search results)
    image_selections: Optional[dict[str, str]] = None


# --- V2 Endpoints ---

@app.post('/v2/projects')
async def create_project(request: CreateProjectRequest):
    """Create a new project, optionally with a master template."""
    master_layouts = None
    master_path = None

    if request.master_file_id:
        found = get_upload_path(request.master_file_id)
        if not found:
            raise HTTPException(status_code=404, detail='Master file not found')
        master_path = str(found)
        master_layouts = await asyncio.to_thread(pptx_service.analyze_master, master_path)

    project_id = db.create_project(request.name, master_path, master_layouts)

    return {
        'project_id': project_id,
        'name': request.name,
        'master_layouts': master_layouts,
    }


async def _run_simple_job(job_id: str, task_type: str, file_paths: list[str]) -> None:
    """Run a non-presentations task (subtitles/karaoke/quiz/padlet/thinglink) as a job.

    These don't need the multi-step pipeline, but still go through the
    job table so GET /v2/generations/{id} works uniformly for every task
    type instead of the frontend needing two different polling shapes.
    """
    db.update_job(job_id, status='processing', step='Elaborazione in corso...', percent=50)
    try:
        if task_type == 'subtitles':
            result = await assemblyai_service.create_subtitles(file_paths[0])
            ext = '.srt'
        elif task_type == 'karaoke':
            result = await assemblyai_service.create_karaoke(file_paths[0])
            ext = '.srt'
        elif task_type == 'quiz':
            result = await content_service.generate_quiz(file_paths)
            ext = '.html'
        elif task_type == 'padlet':
            result = await content_service.generate_padlet(file_paths)
            ext = '.html'
        elif task_type == 'thinglink':
            result = await content_service.generate_thinglink(file_paths)
            ext = '.html'
        else:
            raise ValueError(f'Unknown task type: {task_type}')

        output = save_output(result, Path(file_paths[0]).name, ext)
        db.update_job(job_id, status='completed', step='Completato.', percent=100, data={'output_id': output['id']})
    except Exception as exc:
        logger.exception('Simple job %s (%s) failed', job_id, task_type)
        db.update_job(job_id, status='failed', error=str(exc))


@app.post('/v2/projects/{project_id}/generate')
async def start_generation(project_id: str, request: GenerateRequest):
    """Start a generation job. Returns immediately with a job id to poll.

    Before this, the whole pipeline (LLM call, up to 300s on Bedrock, plus
    LibreOffice PPTX->PDF conversion, up to 120s) ran inline in this
    request handler — blocking the entire single-process server,
    including unrelated /health checks, for the duration.
    """
    file_paths = []
    for file_id in request.source_file_ids:
        file_path = get_upload_path(file_id)
        if not file_path:
            raise HTTPException(status_code=404, detail=f'File {file_id} not found')
        file_paths.append(str(file_path))

    job_id = db.create_job(project_id, request.task_type)

    if request.task_type == 'presentations':
        project = db.get_project(project_id)
        if not project or not project.get('master_path'):
            db.update_job(
                job_id, status='failed',
                error='Nessun template master caricato. Torna indietro e carica un file .pptx.',
            )
            return {'generation_id': job_id, 'status': 'failed'}

        output_dir = str(OUTPUT_DIR / f'thumbs_{job_id}')
        asyncio.create_task(pipeline_steps.run_presentation_job(
            job_id=job_id,
            file_path=file_paths[0],
            master_path=project['master_path'],
            master_layouts=project['master_layouts'],
            num_variants=request.num_variants,
            custom_prompt=request.custom_prompt,
            output_dir=output_dir,
        ))

    elif request.task_type in SIMPLE_TASK_TYPES:
        asyncio.create_task(_run_simple_job(job_id, request.task_type, file_paths))

    else:
        db.update_job(job_id, status='failed', error=f'Unknown task type: {request.task_type}')
        return {'generation_id': job_id, 'status': 'failed'}

    return {'generation_id': job_id, 'status': 'queued'}


def _sections_with_urls(generation_id: str, sections_data: list[dict]) -> list[dict]:
    """Strip server-only fields (placeholder_fills text) before sending to the frontend."""
    out = []
    for section in sections_data:
        variants = []
        for v in section.get('variants', []):
            thumb_filename = Path(v['thumbnail_path']).name
            variants.append({
                'variant_index': v['variant_index'],
                'slide_index': v['slide_index'],
                'layout_name': v['layout_name'],
                'design_rationale': v['design_rationale'],
                'thumbnail_url': f'/thumbnails/{generation_id}/{thumb_filename}',
                'image_placeholder_idx': v.get('image_placeholder_idx'),
                'grounding': v.get('grounding'),
            })
        out.append({
            'section_index': section['section_index'],
            'heading': section['heading'],
            'variants': variants,
        })
    return out


@app.get('/v2/generations/{generation_id}')
async def get_generation(generation_id: str):
    """Poll a job's status. This endpoint didn't exist before — the frontend's
    progress bar was showing hardcoded percentages with no relation to what
    the backend was actually doing.
    """
    job = db.get_job(generation_id)
    if not job:
        raise HTTPException(status_code=404, detail='Generation not found')

    response = {
        'generation_id': job['id'],
        'status': job['status'],
        'step': job['step'],
        'percent': job['percent'],
        'error': job['error'],
    }

    if job['status'] == 'variants_ready':
        response['sections'] = _sections_with_urls(generation_id, job['data'].get('sections', []))
    elif job['status'] == 'completed':
        output_id = job['data'].get('output_id')
        if output_id:
            response['output_url'] = f'/download/{output_id}'

    return response


@app.post('/v2/generations/{generation_id}/build')
async def build_final(generation_id: str, request: BuildRequest):
    """Build the final PPTX containing only the selected variant slides,
    with any operator-picked images inserted into their placeholders.
    """
    job = db.get_job(generation_id)
    if not job:
        raise HTTPException(status_code=404, detail='Generation not found. Please regenerate.')
    if job['status'] not in ('variants_ready', 'completed'):
        raise HTTPException(status_code=400, detail=f'Job is not ready to build (status={job["status"]}).')

    data = job['data']
    all_pptx = data.get('all_variants_pptx_path')
    sections_data = data.get('sections', [])

    if not all_pptx or not Path(all_pptx).exists():
        raise HTTPException(status_code=400, detail='No variant PPTX available. Please regenerate.')

    selections: dict[int, int] = {}
    if request.variant_selections:
        for k, v in request.variant_selections.items():
            selections[int(k)] = int(v)
    else:
        for section in sections_data:
            selections[section['section_index']] = 0

    local_image_paths: dict[str, str] = {}
    if request.image_selections:
        tmp_img_dir = tempfile.mkdtemp(prefix='scolastica_img_')
        for key, url in request.image_selections.items():
            try:
                local_image_paths[key] = await getty_service.download_web_image(url, tmp_img_dir)
            except Exception as exc:
                # A failed image download shouldn't sink the whole build — the
                # operator gets the deck with that one placeholder left empty,
                # same as if they'd never picked an image.
                logger.warning('Could not download image for %s: %s', key, exc)

    try:
        output_path = await asyncio.to_thread(
            pptx_service.build_final_from_selections,
            all_variants_pptx_path=all_pptx,
            selections=selections,
            sections_data=sections_data,
            image_selections=local_image_paths,
        )
        output = save_output(
            open(output_path, 'rb').read(),
            f"scolastica_{generation_id[:8]}",
            '.pptx',
        )
        db.update_job(generation_id, status='completed', step='Completato.', percent=100, data={'output_id': output['id']})
        return {
            'generation_id': generation_id,
            'status': 'completed',
            'output_url': f'/download/{output["id"]}',
        }
    except Exception as e:
        db.update_job(generation_id, status='failed', error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/v2/images/search')
async def search_images(query: str, page: int = 1, page_size: int = 20):
    """Search for images (Getty if configured, Unsplash fallback)."""
    try:
        results = await getty_service.search_images(query, page=page, page_size=page_size)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Generic upload/download ---

@app.post('/upload')
async def upload_files(files: list[UploadFile] = File(...)):
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


@app.get('/download/{result_id}')
async def download_result(result_id: str):
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
        filename=get_output_display_name(result_id, file_path),
        media_type=media_type,
    )


@app.get('/thumbnails/{gen_id}/{filename}')
async def serve_thumbnail(gen_id: str, filename: str):
    """Serve a generated slide thumbnail PNG."""
    thumbs_dir = (OUTPUT_DIR / f'thumbs_{gen_id}').resolve()
    thumb_path = (thumbs_dir / filename).resolve()

    try:
        thumb_path.relative_to(thumbs_dir)
    except ValueError:
        raise HTTPException(status_code=404, detail='Thumbnail not found')

    if not thumb_path.exists():
        raise HTTPException(status_code=404, detail='Thumbnail not found')

    return FileResponse(path=str(thumb_path), filename=filename, media_type='image/png')


@app.get('/health')
async def health_check():
    """Health check endpoint (public, no auth)."""
    return {'status': 'ok', 'version': '2.0.0'}


@app.get('/auth/check')
async def auth_check():
    """Password verification endpoint (protected by middleware)."""
    return {'authenticated': True}


# --- Static frontend serving (for the combined Docker/Railway deploy) ---

STATIC_DIR = (Path(__file__).parent / 'static').resolve()


def _safe_static_path(relative: str) -> Optional[Path]:
    """Resolve `relative` under STATIC_DIR and refuse anything that escapes it.

    The previous version did `STATIC_DIR / path` and checked `.exists()`
    without ever confirming the resolved path was still inside STATIC_DIR
    — a path like `../../backend/.env` would have resolved outside the
    static directory and been served as-is.
    """
    candidate = (STATIC_DIR / relative).resolve()
    try:
        candidate.relative_to(STATIC_DIR)
    except ValueError:
        return None
    return candidate


if STATIC_DIR.exists():
    from fastapi.staticfiles import StaticFiles

    @app.get('/_next/{path:path}')
    async def serve_next_static(path: str):
        safe = _safe_static_path(str(Path('_next') / path))
        if safe and safe.is_file():
            return FileResponse(str(safe))
        raise HTTPException(status_code=404)

    app.mount('/static-assets', StaticFiles(directory=str(STATIC_DIR)), name='static-frontend')

    @app.get('/{path:path}')
    async def serve_frontend(path: str):
        """Serve the static Next.js frontend. Falls back to index.html for SPA routing."""
        if path:
            safe = _safe_static_path(path)
            if safe and safe.is_file():
                return FileResponse(str(safe))
            safe_html = _safe_static_path(f'{path}.html')
            if safe_html and safe_html.is_file():
                return FileResponse(str(safe_html))

        index_file = STATIC_DIR / 'index.html'
        if index_file.exists():
            return HTMLResponse(index_file.read_text())
        raise HTTPException(status_code=404, detail='Frontend not found')
