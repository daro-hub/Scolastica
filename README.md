# Scolastica — AI Educational Content Generator

Web platform that automates the production of educational content — PowerPoint decks, subtitles, quizzes, interactive maps — from source documents, with AI proposing multiple variants for a human to review and approve.

## The idea

Turning a source PDF into a polished, template-matching PowerPoint deck used to be entirely manual: reading every page and rebuilding slides by hand could take most of a working day. Scolastica turns that into an automated pipeline that still keeps a human in control of the final choice for every section.

## How it works (Presentations)

1. **Upload** — the operator uploads a source PDF plus a PowerPoint master template
2. **Analysis** — the backend analyzes the master's layout (placeholders) and the PDF's content
3. **Plan** — Claude proposes 5 layout variants per section, using the exact placeholder idx of the master's own layouts; the result is validated against the schema in [`pipeline/schema.py`](backend/pipeline/schema.py) — an invalid `layout_index`, a placeholder idx that doesn't exist on that layout, or an empty text fill is a validation error, not a silent fallback. If validation fails, one repair round-trip sends the errors back to Claude before giving up
4. **Grounding check** — each text fill is scored against the source PDF by word 4-gram overlap ([`pipeline/grounding.py`](backend/pipeline/grounding.py)); a variant whose text doesn't overlap enough with the source is flagged in the UI instead of silently shipping possibly-invented text
5. **Selection** — the operator picks the best variant per section, plus an image from Unsplash/Getty for any slide with a picture placeholder
6. **Build** — `python-pptx` extracts the selected slides from the rendered deck and inserts the chosen images
7. **Export** — a final PPTX, downloadable, matching the template exactly

The same pipeline extends to other content built from the same source material: auto-generated subtitles for audio/video (via AssemblyAI transcription), quizzes, and interactive image hotspots (ThingLink-style).

## Architecture

The generation pipeline runs as a **background job with an explicit state machine**, not inline in the request handler:

```
queued → extracting → planning (LLM + schema validation + repair) → grounding → rendering → variants_ready → building → completed | failed
```

`POST /v2/projects/{id}/generate` returns immediately with a job id; `GET /v2/generations/{id}` polls the real current step and percent. Before this, the whole pipeline (LLM call, up to 300s on Bedrock, plus a LibreOffice PPTX→PDF conversion) ran inline in a single request, blocking the entire single-process server — including unrelated `/health` checks — for the duration, and the frontend's progress bar showed a made-up percentage with no relation to what the backend was actually doing.

```
scolastica/
├── backend/                 # FastAPI (Python) — deployed on Railway (Docker)
│   ├── main.py               # API endpoints — upload, projects, jobs, images, download
│   ├── config.py             # Single source of truth for all env-based settings
│   ├── db.py                  # SQLite-backed projects/jobs persistence + job state machine
│   ├── llm/
│   │   └── __init__.py        # One entry point for LLM calls (Bedrock preferred, Anthropic fallback),
│   │                           # retry with backoff on transient errors, FAKE_LLM mode for tests/e2e
│   ├── pipeline/
│   │   ├── schema.py          # Typed plan (pydantic) + validation against the master's real layouts
│   │   ├── grounding.py       # Word-4-gram grounding score vs. the source PDF
│   │   └── steps.py           # extract → plan (+repair) → ground → render, orchestrated as a job
│   ├── services/
│   │   ├── pptx_service.py    # Master analysis, PDF extraction, PPTX assembly/rendering
│   │   ├── getty_service.py   # Getty/Unsplash image search + download
│   │   ├── assemblyai_service.py # Audio/video transcription
│   │   └── content_service.py # Quiz/Padlet/ThingLink via Claude vision
│   ├── tests/                 # pytest — schema, grounding, db, pipeline steps, pptx build, file manager
│   └── utils/file_manager.py  # Upload/output storage, exact id-prefix lookup
│
├── frontend/                 # Next.js 14 (static export) + Tailwind + shadcn/ui
│   └── src/
│       ├── app/page.tsx       # Thin orchestrator: header, step routing
│       ├── components/steps/  # One component per wizard step (Task/Upload/Review/Done)
│       ├── hooks/useGenerationPolling.ts # Polls GET /v2/generations/{id} while a job runs
│       ├── components/        # Task selector, variant selector, image picker, upload zone
│       ├── lib/api.ts         # API client — every backend path resolved through resolveApiUrl()
│       └── store/useAppStore.ts # Zustand wizard state
│
└── e2e/                      # Playwright, against synthetic fixtures + FAKE_LLM (no real credentials)
    ├── global-setup.ts        # Generates a throwaway master.pptx + source.pdf
    └── app.spec.ts
```

### Why a job/state-machine instead of a request/response

A trading-idea-style loop ("write, test, learn, revise") doesn't apply here, but the same principle that made Orbis's backtester trustworthy applies: **explicit state beats implicit state**. Before this refactor, `_project_cache`/`_generation_cache` were plain in-memory dicts — a Railway restart mid-generation silently lost the job, and the plan coming back from the LLM was trusted as-is (a bad `layout_index` silently became slide layout 0, a bad placeholder idx was skipped via a caught `KeyError`). Now the job's status/step/percent/data live in SQLite ([`db.py`](backend/db.py)) and every LLM plan is validated against the master's actual placeholders before it's ever rendered.

**Known limitation:** if the backend process restarts mid-job, nothing resumes it — the row just stays at its last persisted step. Acceptable for this project's scale (one operator, one job at a time, jobs finish in a couple of minutes); a real queue with a resumable worker would be the next step if this needed to survive restarts. Also note that Railway's filesystem is ephemeral by default — the SQLite file (and uploads/outputs) won't survive a redeploy unless a volume is mounted at `backend/data/`.

## Stack

- **Backend:** FastAPI (Python) — pipeline orchestration, PPTX/PDF processing, SQLite persistence
- **Frontend:** Next.js (static export) — wizard UI, deployed as static files served by the backend
- **LLM:** Amazon Bedrock (Claude, preferred) or the direct Anthropic API (fallback)
- **Images:** Unsplash (free) or Getty (paid, if configured)

## Requirements

- Python >= 3.11
- Node.js >= 18
- LibreOffice (headless) — used to render slide previews to PNG. Set `LIBREOFFICE_PATH` if it's not at the default location assumed for your OS.

## Local setup

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
# fill in .env — at minimum a Bedrock or Anthropic key to actually generate content
uvicorn main:app --reload --port 8000
```

Server runs at http://localhost:8000. Interactive docs at `/docs`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# set NEXT_PUBLIC_API_URL=http://localhost:8000 for local dev with two separate servers
npm run dev
```

Frontend runs at http://localhost:3000.

## Tests

### Backend (pytest)

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

No personal files, no real LLM credentials, no LibreOffice required — fixtures build a synthetic master `.pptx` (python-pptx's own bundled default template) and a tiny PDF on the fly, and `FAKE_LLM=1` (or a registered fake responder) skips the network call entirely. Covers: PDF reading order, plan schema validation (including the repair round-trip), grounding scoring, the job state machine (including that a completed/failed job is terminal), building the final PPTX from selections (including image insertion), and the exact-id-prefix output lookup.

### End-to-end (Playwright)

```bash
npm install
npx playwright install chromium
npm test
```

Runs against a real backend + frontend dev server (started automatically, see `playwright.config.ts`), with `FAKE_LLM=1` — no real LLM credentials needed, no real API spend. Fixtures (a synthetic master/source pair) are generated fresh by `e2e/global-setup.ts`, not checked into the repo and not tied to any one operator's machine — the previous suite pointed at a specific person's `Downloads` folder and could only ever run there. Requires the backend's Python venv active (or `python` on PATH with `backend/requirements.txt` installed) and LibreOffice installed, same as running the backend directly.

There used to be a separate `e2e-prod.spec.ts` that ran against the real production URL with **the real production app password hardcoded in the file**. That password has been rotated; the file is gone. If you need a manual smoke test against a deployed environment, point `playwright.config.ts`'s `use.baseURL` at it and pass the password via an env var — never hardcode a real credential in a test file that gets committed.

## Reliability

- LLM read calls (the plan generation) retry with exponential backoff on transient errors (timeouts, 429/5xx); a non-retryable error (bad request, auth) fails fast instead of burning attempts on the same failure.
- Blocking work — the Bedrock SDK call, PyMuPDF, LibreOffice's subprocess — runs via `asyncio.to_thread`, so it can't stall the event loop for unrelated requests.
- A failed image download during the final build doesn't sink the whole export; that one placeholder is just left empty, same as if the operator hadn't picked an image.

## Auth & CORS

Set `APP_PASSWORD` in `.env` to require an `X-App-Password` header on the API (`/v2/*`, `/upload`, `/auth/check`); left unset, the API is open (fine for local dev). The password is **header-only** — a `?password=` query-param fallback used to also be accepted, which meant it could end up in server/proxy access logs.

`/download/{id}` and `/thumbnails/{gen}/{file}` are intentionally reachable without the header: `<img>` tags and `<a>` downloads can't attach a custom header, so they rely on their ids being unguessable UUIDs instead. The static frontend build is also served without the header, since its JS has to load before it can even render the password prompt — the frontend's own `PasswordGate` component is what the operator actually sees.

Set `ALLOWED_ORIGINS` (comma-separated) to restrict which frontend origins the API accepts requests from — see `backend/.env.example`.

## Deploy

Single Railway service, built from the root `Dockerfile`: it builds the Next.js frontend as a static export, then copies it into the FastAPI backend's image alongside LibreOffice — one process serves both the API and the static frontend on the same origin (so no CORS/API-URL configuration is needed in production). `railway.json` points Railway at that Dockerfile.

Environment variables (Railway dashboard): `BEDROCK_AWS_*` or `ANTHROPIC_API_KEY`, `ASSEMBLYAI_API_KEY`, `GETTY_*`/`UNSPLASH_ACCESS_KEY` (optional), `APP_PASSWORD`, `ALLOWED_ORIGINS` — see `backend/.env.example` for the full list.

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload a source document / master template |
| POST | `/v2/projects` | Create a project, analyzing the master template if provided |
| POST | `/v2/projects/{id}/generate` | Start a generation job — returns immediately with a job id |
| GET | `/v2/generations/{id}` | Poll job status/step/percent; sections once `variants_ready` |
| POST | `/v2/generations/{id}/build` | Build the final output from the operator's selections |
| GET | `/v2/images/search` | Search images (Unsplash/Getty) |
| GET | `/download/{result_id}` | Download a generated output file |
| GET | `/thumbnails/{gen_id}/{filename}` | Serve a rendered slide thumbnail PNG |
| GET | `/health` | Health check (public) |

## External APIs

| Service | Use | Estimated cost |
|---------|-----|-----------------|
| Claude (Bedrock or Anthropic) | Plan generation, quiz/Padlet/ThingLink content | ~$0.05–0.15 per generation |
| AssemblyAI | Audio/video transcription | ~$0.006/min |
| Unsplash | Free image search/download | Free |
| Getty Images | Editorial image search (optional) | ~1 EUR/image |
