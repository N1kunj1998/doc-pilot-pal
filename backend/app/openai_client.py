# Subclass of openai.OpenAI that auto-traces every call to Langfuse when
# LANGFUSE_* env vars are set (bridged from Settings in app/config.py),
# and is a no-op passthrough otherwise.
from langfuse.openai import OpenAI

from app.config import settings


def get_openai_client() -> OpenAI:
    return OpenAI(api_key=settings.openai_api_key)
