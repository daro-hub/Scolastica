#!/bin/bash
set -e

cd /app/backend

# Start FastAPI on the Railway-assigned PORT (default 8000)
# FastAPI serves both API and static frontend files
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
