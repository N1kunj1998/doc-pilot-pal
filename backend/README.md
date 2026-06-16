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

## Render deploy

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Env var: `ALLOWED_ORIGINS` = comma-separated frontend URL(s), e.g. `https://docpilot-frontend.onrender.com`
