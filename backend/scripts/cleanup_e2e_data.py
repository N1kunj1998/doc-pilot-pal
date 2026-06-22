"""Cleanup script for E2E test data accumulated in production.

The Playwright golden-path E2E test (frontend/e2e/tests/golden-path.spec.ts)
runs against the real deployed environment and creates a fresh org per run
named "E2E-TEST <runId>" (or "E2E-TEST-DEBUG-*" in some manual runs), with a
user whose email looks like "e2e-test-<runId>@e2e.docpilot.example". There is
no delete endpoint in the API, so this script bypasses the API and deletes
that data directly via SQLAlchemy (Postgres) and the configured S3-compatible
object storage client.

This script is destructive. It is intended to be run:
  - manually, against production, to clean up leftover test orgs, and
  - eventually from CI (a future task) after each E2E run.

Usage:
    cd backend && python scripts/cleanup_e2e_data.py

The DATABASE_URL / storage_* settings come from app.config.settings, which
reads from the environment (or a local .env file). Make sure the environment
this is run in is pointed at the intended database before running -- this
performs a real commit, not a dry run.
"""

from app.config import settings
from app.db import SessionLocal
from app.models import ChatMessage, ChatThread, Chunk, Document, Org, User
from app.storage import get_s3_client


def main() -> None:
    db = SessionLocal()
    try:
        test_orgs = db.query(Org).filter(Org.name.like("E2E-TEST%")).all()
        print(f"Found {len(test_orgs)} E2E test org(s) to clean up.")

        succeeded = 0
        failed = 0
        for org in test_orgs:
            print(f"Cleaning up org: {org.name} (id={org.id})")

            try:
                documents = db.query(Document).filter(Document.org_id == org.id).all()
                for document in documents:
                    if document.storage_path:
                        try:
                            get_s3_client().delete_object(
                                Bucket=settings.storage_bucket, Key=document.storage_path
                            )
                        except Exception as e:
                            print(f"  warning: failed to delete storage object {document.storage_path}: {e}")
                    db.query(Chunk).filter(Chunk.document_id == document.id).delete()

                threads = db.query(ChatThread).filter(ChatThread.org_id == org.id).all()
                for thread in threads:
                    db.query(ChatMessage).filter(ChatMessage.thread_id == thread.id).delete()
                db.query(ChatThread).filter(ChatThread.org_id == org.id).delete()

                db.query(Document).filter(Document.org_id == org.id).delete()
                db.query(User).filter(User.org_id == org.id).delete()
                db.delete(org)

                db.commit()
                succeeded += 1
            except Exception as e:
                print(f"  error: failed to clean up org {org.name} (id={org.id}): {e}")
                db.rollback()
                failed += 1
                continue

        print(f"Cleanup complete: {succeeded} org(s) cleaned up, {failed} failed.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
