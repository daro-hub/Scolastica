"""
Scolastica Backend - FastAPI application for content creator workflows.

Endpoints:
- POST /upload: Upload files (PDF, DOCX, PPTX, audio, video)
- POST /process: Process files with selected task
- GET /download/{result_id}: Download generated output
"""
import os
from pathlib import Path
from typing import List

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
    description='Content creator workflow automation using AI services',
    version='0.1.0',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.pptx', '.mp3', '.wav', '.mp4'}
AUDIO_VIDEO_EXTENSIONS = {'.mp3', '.wav', '.mp4'}
DOCUMENT_EXTENSIONS = {'.pdf', '.docx', '.pptx'}


class ProcessRequest(BaseModel):
    task_type: str
    file_ids: List[str]
    gamma_template_id: str | None = None
    export_format: str | None = None
    custom_prompt: str | None = None


class OutputInfo(BaseModel):
    id: str
    filename: str
    extension: str


class ProcessResponse(BaseModel):
    task_type: str
    outputs: List[OutputInfo]


@app.post('/upload')
async def upload_files(files: List[UploadFile] = File(...)):
    """
    Upload one or more files. Returns list of file_ids for later processing.
    Accepts: PDF, DOCX, PPTX, MP3, WAV, MP4
    """
    file_ids = []
    
    for file in files:
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f'File type {ext} not allowed. Allowed: {ALLOWED_EXTENSIONS}',
            )
        
        content = await file.read()
        file_id = save_upload(content, file.filename)
        file_ids.append(file_id)
    
    return {'file_ids': file_ids, 'count': len(file_ids)}


@app.post('/process', response_model=ProcessResponse)
async def process_files(request: ProcessRequest):
    """
    Process uploaded files with the selected task.
    
    Tasks:
    - subtitles: Generate SRT from audio/video (AssemblyAI)
    - karaoke: Generate SRT with speaker labels (AssemblyAI)
    - presentations: Generate PPTX from document (Gamma)
    - maps: Generate interactive PPTX (Gamma)
    - quiz: Generate quiz HTML (OpenAI) - sends all files together
    - padlet: Generate Padlet content HTML (OpenAI) - sends all files together
    - thinglink: Generate ThingLink content HTML (OpenAI) - sends all files together
    """
    task = request.task_type
    file_ids = request.file_ids
    
    if not file_ids:
        raise HTTPException(status_code=400, detail='No files provided')
    
    outputs = []
    
    # Get all file paths
    file_paths = []
    for file_id in file_ids:
        file_path = get_upload_path(file_id)
        if not file_path:
            raise HTTPException(status_code=404, detail=f'File {file_id} not found')
        file_paths.append(file_path)
    
    try:
        # Tasks that process all files together (OpenAI with direct file upload)
        if task in ('quiz', 'padlet', 'thinglink'):
            # Validate all files are documents
            for file_path in file_paths:
                ext = file_path.suffix.lower()
                if ext not in DOCUMENT_EXTENSIONS:
                    raise HTTPException(
                        status_code=400,
                        detail=f'{task.capitalize()} task requires document files, got {ext}',
                    )
            
            # Convert paths to strings
            file_path_strs = [str(fp) for fp in file_paths]
            
            if task == 'quiz':
                content = await content_service.generate_quiz(file_path_strs)
            elif task == 'padlet':
                content = await content_service.generate_padlet(file_path_strs)
            else:  # thinglink
                content = await content_service.generate_thinglink(file_path_strs)
            
            output = save_output(content, file_paths[0].name, '.html')
            outputs.append(OutputInfo(
                id=output['id'],
                filename=output['filename'],
                extension=output['extension'],
            ))
        
        # Tasks that process files individually
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
                    break  # Only one output for presentations
                    
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
                    
                    map_instructions = '''Create an INTERACTIVE MAP presentation with this EXACT structure:

SLIDE 1 - TITLE SLIDE:
- Main title of the presentation
- Subtitle if appropriate

SLIDE 2 - INTERACTIVE INDEX/MAP SLIDE (CRITICAL):
- Title: "Indice" or "Mappa dei Contenuti"
- Create a CARD/BOX for EACH chapter - these will be made clickable
- Each card should be a colored rectangle/box with the chapter title inside
- Cards arranged in a grid layout (2-3 columns)
- Each card contains ONLY the chapter title (short, max 4-5 words)
- Use colored backgrounds so cards are clearly visible
- Leave space between cards

SLIDES 3+ - CHAPTER CONTENT:
- Each chapter starts with a clear title slide
- The chapter title must EXACTLY match what's written in the index card
- Include relevant content, images, and explanations

IMPORTANT - "BACK TO INDEX" BUTTON ON EVERY SLIDE (except index):
- Add a SMALL, DISCRETE button in the bottom-right corner
- Text: "← Indice" 
- Style: small rectangle, subtle color (gray or muted), small font
- Size: approximately 2cm x 0.8cm - NOT too big, should not distract from content
- Position: bottom-right corner, with some margin from edges
- This button must be present on EVERY slide except the index slide

STRUCTURE REQUIREMENTS:
- INDEX slide: colored CARDS for each chapter (will become clickable)
- ALL OTHER SLIDES: small "← Indice" button in bottom-right (will become clickable)
- Keep chapter titles SHORT and IDENTICAL between index cards and chapter slides
- Create 4-8 chapters based on the source content
- The back button should be SUBTLE and NOT dominate the slide'''

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
                    break  # Only one output for maps
                    
                else:
                    raise HTTPException(status_code=400, detail=f'Unknown task: {task}')
                
                # For subtitles/karaoke, add each output
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
    """
    Download a generated output file by its ID.
    """
    file_path = get_output_path(result_id)
    
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail='Result not found')
    
    media_types = {
        '.srt': 'application/x-subrip',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.pdf': 'application/pdf',
        '.md': 'text/markdown',
    }
    
    file_ext = file_path.suffix.lower()
    media_type = media_types.get(file_ext, 'application/octet-stream')
    
    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type=media_type,
    )


@app.get('/health')
async def health_check():
    """Health check endpoint."""
    return {'status': 'ok'}
