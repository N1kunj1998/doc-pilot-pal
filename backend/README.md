# DocPilot backend

FastAPI + SQLAlchemy + Alembic. Endpoints:

- `GET /health` — health check
- `GET /api/hello` — sanity-check endpoint frontend calls to prove connection
- `POST /auth/signup` — create an org + an Admin user, returns a JWT
- `POST /auth/login` — returns a JWT
- `GET /auth/me` — current user, requires `Authorization: Bearer <token>`
- `GET /documents` — list the current org's documents, requires auth
- `POST /documents` — multipart upload (`file` field), 25MB max, PDF/txt/doc/docx/md only, requires auth. Synchronously extracts text, chunks it, generates embeddings (OpenAI), and stores them before responding — the returned document's `status` is `"indexed"` or `"failed"`, not just `"processing"`.

## Local run

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # defaults to a local SQLite file, no DB setup needed
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

## Environment variables

| Var | Local default | Notes |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./dev.db` | Production uses a Postgres URL (Neon) — see root `CREDENTIALS.md` (not in repo) |
| `JWT_SECRET` | `dev-secret-change-me` | Must be a real random secret in production |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated frontend URL(s), for CORS |
| `PORT` | `8000` | |
| `STORAGE_ENDPOINT_URL` | empty | S3-compatible endpoint (Supabase Storage in production) — see root `CREDENTIALS.md` |
| `STORAGE_REGION` | empty | |
| `STORAGE_BUCKET` | empty | |
| `STORAGE_ACCESS_KEY_ID` | empty | |
| `STORAGE_SECRET_ACCESS_KEY` | empty | |
| `OPENAI_API_KEY` | empty | Used for embeddings (and, later, chat completions). Not a GitHub Actions secret — tests mock all OpenAI calls, so CI never needs a real key. |

Uploads will fail locally unless the storage and OpenAI vars are set to real values — there's no local-only fallback for either (unlike `DATABASE_URL`, which defaults to SQLite). If you need to test uploads locally, copy the values from `CREDENTIALS.md`.

### A note on `chunks.embedding` and SQLite

The `chunks` table's `embedding` column uses a custom type (`app/db_types.Vector`) that renders as real `pgvector` on Postgres and as JSON-encoded text on SQLite. This means local dev/tests can create and read `Chunk` rows without a real Postgres+pgvector instance, but **similarity search (cosine distance, etc.) only works on Postgres** — there's no SQLite fallback for that, since it would require implementing vector math in Python. Phase 4's retrieval endpoint will only ever run that search path against the real production database.

## Migrations

```bash
alembic upgrade head                              # apply migrations
alembic revision --autogenerate -m "description"  # generate a new one after changing app/models.py
```

Migrations run automatically on container start in production (see `Dockerfile`'s `CMD`), so a deploy with a new migration applies it before the server starts serving traffic.

## Testing

```bash
pip install -r requirements-dev.txt
pytest -v --cov=app
```

Tests run against an isolated in-memory SQLite DB per test (see `tests/conftest.py`) — never against the real dev or production database. Document upload tests mock `app.storage.upload_file` and `app.ingestion.generate_embeddings` so they never make a real network call to Supabase or OpenAI. Covers `/health`, `/api/hello`, CORS behavior, the full signup/login/me auth flow (including the same-error-message-for-wrong-password-and-unknown-email behavior, a deliberate anti-enumeration choice), document upload/list (org isolation, file size/type validation), and the ingestion pipeline (chunking, text extraction for txt/md/pdf/docx, embedding generation, and the cross-dialect `Vector` column type).

## Docker

```bash
docker build -t docpilot-backend ./backend
docker run -p 8000:8000 \
  -e ALLOWED_ORIGINS=http://localhost:3000 \
  -e DATABASE_URL=sqlite:////tmp/dev.db \
  -e JWT_SECRET=dev-secret \
  docpilot-backend
```

Or run both services together: `docker compose up --build` from repo root.

## Render deploy

**Option A — Docker (recommended, matches local testing exactly):**
- New Web Service → connect repo → Render auto-detects `backend/Dockerfile`
- Root directory: `backend`
- Env vars: `ALLOWED_ORIGINS`, `DATABASE_URL`, `JWT_SECRET` (see table above)

**Option B — native Python runtime (no Docker):**
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Env vars: same as above
