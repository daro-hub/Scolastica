# Scolastica

MVP web application for automating content creator workflows using external AI services.

## Architecture

- **Frontend**: Next.js (App Router)
- **Backend**: FastAPI (Python)
- **External APIs**: AssemblyAI (transcription), Gamma (presentations)

## Features

| Task | Input | Output | API |
|------|-------|--------|-----|
| Subtitles | Audio/Video | .srt | AssemblyAI |
| Karaoke | Audio/Video | .srt (with speakers) | AssemblyAI |
| Presentations | PDF/DOCX | .pptx | Gamma |
| Interactive Maps | PDF/DOCX | .pptx | Gamma |
| Quiz | PDF/DOCX | .html | OpenAI |
| Padlet | PDF/DOCX | .html | OpenAI |
| ThingLink | PDF/DOCX | .html | OpenAI |

## Setup

### 1. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your API keys:
# - ASSEMBLYAI_API_KEY
# - GAMMA_API_KEY
# - OPENAI_API_KEY

# Run server
uvicorn main:app --reload
```

Backend runs at: http://localhost:8000

API docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Frontend runs at: http://localhost:3000

## API Endpoints

### POST /upload
Upload files (PDF, DOCX, PPTX, MP3, WAV, MP4)

```bash
curl -X POST http://localhost:8000/upload \
  -F "files=@document.pdf"
```

### POST /process
Process uploaded files with selected task

```bash
curl -X POST http://localhost:8000/process \
  -H "Content-Type: application/json" \
  -d '{"task_type": "subtitles", "file_ids": ["uuid-here"]}'
```

### GET /download/{result_id}
Download generated output

```bash
curl -O http://localhost:8000/download/result-uuid
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| ASSEMBLYAI_API_KEY | AssemblyAI API key for transcription |
| GAMMA_API_KEY | Gamma API key for presentation generation |
| OPENAI_API_KEY | OpenAI API key for Quiz/Padlet/ThingLink generation |

## Project Structure

```
Scolastica/
├── backend/
│   ├── main.py              # FastAPI app with endpoints
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment template
│   ├── services/
│   │   ├── assemblyai_service.py  # AssemblyAI integration
│   │   ├── gamma_service.py       # Gamma API integration
│   │   └── content_service.py     # Quiz/Padlet/ThingLink generation
│   └── utils/
│       └── file_manager.py  # File upload/download handling
└── frontend/
    ├── package.json
    ├── next.config.js
    └── src/app/
        ├── layout.js        # Root layout
        ├── globals.css      # Global styles
        └── page.js          # Main UI component
```

## Notes

- Files are sent **as-is** to external APIs without preprocessing
- Temporary files are stored in `backend/uploads/` and `backend/outputs/`
- For production, implement proper file cleanup and storage
