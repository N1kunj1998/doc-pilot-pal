# DocPilot backend

Basic FastAPI skeleton. Two endpoints for now:

- `GET /health` — health check
- `GET /api/hello` — sanity-check endpoint frontend calls to prove connection

## Local run

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Docker

```bash
docker build -t docpilot-backend ./backend
docker run -p 8000:8000 -e ALLOWED_ORIGINS=http://localhost:3000 docpilot-backend
```

Or run both services together: `docker compose up --build` from repo root.

## Render deploy

**Option A — Docker (recommended, matches local testing exactly):**
- New Web Service → connect repo → Render auto-detects `backend/Dockerfile`
- Root directory: `backend`
- Env var: `ALLOWED_ORIGINS` = comma-separated frontend URL(s), e.g. `https://docpilot-frontend.onrender.com`

**Option B — native Python runtime (no Docker):**
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Env var: same as above
