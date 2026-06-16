# DocPilot

[![CI](https://github.com/N1kunj1998/doc-pilot-pal/actions/workflows/ci.yml/badge.svg)](https://github.com/N1kunj1998/doc-pilot-pal/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/N1kunj1998/doc-pilot-pal/branch/main/graph/badge.svg?flag=backend)](https://codecov.io/gh/N1kunj1998/doc-pilot-pal)
[![codecov](https://codecov.io/gh/N1kunj1998/doc-pilot-pal/branch/main/graph/badge.svg?flag=frontend)](https://codecov.io/gh/N1kunj1998/doc-pilot-pal)

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

## Testing

```bash
cd backend && pip install -r requirements-dev.txt && pytest -v --cov=app
```

```bash
cd frontend && bun run test            # one-shot
cd frontend && bun run test:watch      # watch mode while developing
cd frontend && bun run test:coverage   # with coverage report
```

### CI (`.github/workflows/ci.yml`)

Runs on every push/PR to `main`:

- **backend-tests** — pytest + coverage
- **frontend-tests** — Vitest + coverage, then a production build as a smoke test
- **docker-build** — builds both Dockerfiles (no push) to catch broken Docker setups before they reach Render
- **secret-scan** — [Gitleaks](https://github.com/gitleaks/gitleaks), fails the build if a secret/credential gets committed
- **sast** — [Semgrep](https://semgrep.dev/) static analysis for common vulnerability patterns

Coverage uploads to Codecov (set the `CODECOV_TOKEN` repo secret, and connect the repo at [codecov.io](https://codecov.io) for the badges above to populate — the CI step is wired up either way and won't fail the build if the token is missing).

There's no staging environment yet — `main` deploys straight to the Render services below on every push. CI passing is the gate before that happens.

## Render deploy

Two separate services, each pointed at this repo:

- **frontend**: root directory `frontend`, Dockerfile auto-detected, build arg `VITE_API_URL=<backend-render-url>`
- **backend**: root directory `backend`, Dockerfile auto-detected, env var `ALLOWED_ORIGINS=<frontend-render-url>`
