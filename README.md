# Scolastica — AI Educational Content Generator

Web platform that automates the production of educational content — PowerPoint decks, subtitles, quizzes, interactive maps — from source documents, with AI proposing multiple variants for a human to review and approve.

## The idea

Turning a source PDF into a polished, template-matching PowerPoint deck used to be entirely manual: reading every page and rebuilding slides by hand could take most of a working day. Scolastica turns that into an automated pipeline that still keeps a human in control of the final choice for every section.

## How it works (Presentations v2)

1. **Upload** — the operator uploads a source PDF plus a PowerPoint master template
2. **Analysis** — the backend analyzes the master's layout (placeholders) and the PDF's content
3. **Variant generation** — Claude generates 5 proposals per section, using only text lifted from the source, never invented
4. **Selection** — the operator picks the best variant per section, plus images from Getty/Unsplash
5. **Build** — `python-pptx` populates the master with the operator's choices
6. **Export** — a final PPTX, downloadable, matching the template exactly

What used to take most of a working day by hand comes down to about 30 minutes end to end.

The same pipeline extends to other content built from the same source material: auto-generated subtitles for audio/video (via AssemblyAI transcription), quizzes, and interactive maps.

## Architecture

```
scolastica/
├── backend/          # FastAPI (Python) — deployed on Vercel Functions
│   ├── main.py       # API endpoints (v1 legacy + v2 variant-based)
│   ├── services/
│   │   ├── pptx_service.py       # PowerPoint: master analysis + variant generation via Claude + build
│   │   ├── getty_service.py      # Getty/Unsplash image search
│   │   ├── assemblyai_service.py # Audio/video transcription
│   │   ├── content_service.py    # Quiz/Padlet/ThingLink via Claude
│   │   ├── gamma_service.py      # Legacy: Gamma API presentations
│   │   └── map_service.py        # Interactive maps (post-processing)
│   └── utils/
│       └── file_manager.py
│
└── frontend/         # Next.js 14 + Tailwind + shadcn/ui — deployed on Vercel
    └── src/
        ├── app/          # App Router pages
        ├── components/   # UI components (wizard, variant selector, image picker)
        ├── lib/          # API client + utilities
        └── store/        # Zustand state management
```

## Local setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# fill in .env with your API keys
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# fill in .env.local with your API keys
npm run dev
```

## Deploy (Vercel)

Two separate Vercel projects:

- **Frontend:** root `frontend/`, Next.js framework (auto-detected)
- **Backend:** root `backend/`, Python runtime (`vercel.json` configures routing)

Environment variables required on the Vercel dashboard:
- Frontend: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Backend: `ANTHROPIC_API_KEY`, `ASSEMBLYAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GETTY_API_KEY` (optional), `UNSPLASH_ACCESS_KEY` (fallback)

## Database

Supabase, tables:
- `scolastica_projects` — projects with their master template
- `scolastica_generations` — generation jobs with variants and selections
- `scolastica_image_usage` — image usage tracking (for billing)

## External APIs

| Service | Use | Estimated cost |
|---------|-----|-----------------|
| Claude (Anthropic) | Variant, quiz, and Padlet generation | ~$0.05–0.15 per generation |
| AssemblyAI | Audio/video transcription | ~$0.006/min |
| Getty Images | Editorial image search | ~1 EUR/image |
| Unsplash | Free image fallback | Free |
