# DocPilot backend

FastAPI + SQLAlchemy + Alembic. Endpoints:

- `GET /health` — health check
- `GET /api/hello` — sanity-check endpoint frontend calls to prove connection
- `POST /auth/signup` — create an org + an Admin user, returns a JWT
- `POST /auth/login` — returns a JWT
- `GET /auth/me` — current user, requires `Authorization: Bearer <token>`
- `GET /documents` — list the current org's documents, requires auth
- `POST /documents` — multipart upload (`file` field), 25MB max, PDF/txt/doc/docx/md only, requires auth. Synchronously extracts text, chunks it, generates embeddings (OpenAI), and stores them before responding — the returned document's `status` is `"indexed"` or `"failed"`, not just `"processing"`.
- `GET /chat/threads` — list the current org's chat threads, each with its messages nested, requires auth
- `POST /chat/threads` — create a new thread (optional `title`, defaults to `"New conversation"`), requires auth
- `POST /chat/threads/{id}/messages` — ask a question in a thread: embeds the question, runs a pgvector similarity search against the org's chunks, calls `gpt-4o-mini` with the retrieved context, stores both the user's message and the assistant's reply, and returns the assistant's reply with real citations (chunk id, document name, page if known, snippet). 404s if the thread doesn't belong to the caller's org.

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

The `chunks` table's `embedding` column uses a custom type (`app/db_types.Vector`) that renders as real `pgvector` on Postgres and as JSON-encoded text on SQLite. This means local dev/tests can create and read `Chunk` rows, and even run similarity search, without a real Postgres+pgvector instance — `app/retrieval.py` uses the real pgvector `<=>` operator (via `Chunk.embedding.cosine_distance(...)`) on Postgres, and falls back to computing cosine similarity in Python on SQLite. The SQLite path is real ranking logic, not a mock — it's just slower (`O(n)` in Python instead of an indexed DB operator), which is fine at test/dev data volumes and never used in production.

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

Tests run against an isolated in-memory SQLite DB per test (see `tests/conftest.py`) — never against the real dev or production database. Document upload tests mock `app.storage.upload_file` and `app.ingestion.generate_embeddings` so they never make a real network call to Supabase or OpenAI; chat tests mock `app.routers.chat.answer_question` the same way. Covers `/health`, `/api/hello`, CORS behavior, the full signup/login/me auth flow (including the same-error-message-for-wrong-password-and-unknown-email behavior, a deliberate anti-enumeration choice), document upload/list (org isolation, file size/type validation), the ingestion pipeline (chunking, text extraction for txt/md/pdf/docx, embedding generation, and the cross-dialect `Vector` column type — including that its `cosine_distance` comparator actually compiles to pgvector's `<=>` operator), retrieval (similarity ranking and org isolation, using a real Python-computed cosine similarity on SQLite), and the chat/RAG endpoints (thread creation/isolation, real citations, 404s on cross-org access).

Retrieval and the `Vector` type's `cosine_distance` were also verified against the *real* Neon database (pgvector) and the real OpenAI API in a throwaway script before this was committed — SQLite can exercise the cosine-similarity fallback for real, but the actual pgvector `<=>` operator only exists on Postgres, so it needed a real check, not just a mock.

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
