# Scolastica

Piattaforma web per automatizzare la creazione di contenuti educativi (PowerPoint, sottotitoli, quiz, mappe interattive) a partire da documenti sorgente, con AI che genera varianti multiple e l'operatore sceglie la migliore.

## Architettura

```
scolastica/
├── backend/          # FastAPI (Python) - deploy su Vercel Functions
│   ├── main.py       # Endpoint API (v1 legacy + v2 variant-based)
│   ├── services/
│   │   ├── pptx_service.py      # PowerPoint: analisi master + generazione varianti via Claude + build
│   │   ├── getty_service.py      # Ricerca immagini Getty/Unsplash
│   │   ├── assemblyai_service.py # Trascrizione audio/video
│   │   ├── content_service.py    # Quiz/Padlet/ThingLink via Claude
│   │   ├── gamma_service.py      # Legacy: Gamma API presentations
│   │   └── map_service.py        # Mappe interattive (post-processing)
│   └── utils/
│       └── file_manager.py
│
└── frontend/         # Next.js 14 + Tailwind + shadcn/ui - deploy su Vercel
    └── src/
        ├── app/          # App Router pages
        ├── components/   # UI components (wizard, variant selector, image picker)
        ├── lib/          # API client + utilities
        └── store/        # Zustand state management
```

## Workflow principale (Presentations v2)

1. **Upload**: operatore carica PDF sorgente + master .pptx del cliente
2. **Analisi**: backend analizza il master (layout, placeholder) e il contenuto del PDF
3. **Generazione varianti**: Claude genera 5 proposte per ogni sezione, usando solo testo tagliato dall'originale (mai rielaborato)
4. **Selezione**: operatore sceglie la variante preferita per ogni sezione + immagini da Getty
5. **Build**: python-pptx popola il master con le scelte dell'operatore
6. **Export**: PPTX finale scaricabile, aderente al master del cliente

## Setup locale

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Compilare .env con le API keys
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Compilare .env.local
npm run dev
```

## Deploy (Vercel)

Due progetti Vercel separati:

- **Frontend**: root `frontend/`, framework Next.js (auto-detected)
- **Backend**: root `backend/`, runtime Python (vercel.json configura routing)

Environment variables richieste su Vercel dashboard:
- Frontend: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Backend: `ANTHROPIC_API_KEY`, `ASSEMBLYAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GETTY_API_KEY` (opzionale), `UNSPLASH_ACCESS_KEY` (fallback)

## Database

Supabase (progetto `gestionale-amuseapp`), tabelle:
- `scolastica_projects` - progetti con master template
- `scolastica_generations` - job di generazione con varianti e selezioni
- `scolastica_image_usage` - tracking immagini per billing

## API esterne

| Servizio | Uso | Costo stimato |
|----------|-----|---------------|
| Claude (Anthropic) | Generazione varianti, quiz, padlet | ~$0.05-0.15 per generazione |
| AssemblyAI | Trascrizione audio/video | ~$0.006/min |
| Getty Images | Ricerca immagini editoriali | max 1 EUR/immagine (budget Mondadori) |
| Unsplash | Fallback immagini free | Gratuito |
