# DocPilot

- `frontend/` — TanStack Start + React + Tailwind. See `frontend/Dockerfile`.
- `backend/` — FastAPI. See `backend/README.md`.

## Local dev (Docker)

```bash
docker compose up --build
```

Frontend on `localhost:3000`, backend on `localhost:8000`.

## Local dev (without Docker)

```bash
cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000
```

```bash
cd frontend && bun install && bun run dev
```

## Render deploy

Two separate services, each pointed at this repo:

- **frontend**: root directory `frontend`, Dockerfile auto-detected, build arg `VITE_API_URL=<backend-render-url>`
- **backend**: root directory `backend`, Dockerfile auto-detected, env var `ALLOWED_ORIGINS=<frontend-render-url>`
