import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./dev.db"
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 1 week
    allowed_origins: str = "http://localhost:3000"

    storage_endpoint_url: str = ""
    storage_region: str = ""
    storage_bucket: str = ""
    storage_access_key_id: str = ""
    storage_secret_access_key: str = ""

    openai_api_key: str = ""

    langfuse_secret_key: str = ""
    langfuse_public_key: str = ""
    langfuse_base_url: str = ""

    @property
    def sqlalchemy_database_url(self) -> str:
        # Neon/most managed Postgres URLs come as "postgresql://..." which
        # SQLAlchemy resolves to psycopg2 by default. We install psycopg3
        # instead, so force that dialect explicitly.
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        return self.database_url

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]


settings = Settings()

# The Langfuse SDK discovers its credentials from os.environ, but
# pydantic-settings loads .env into this Settings object only, not into
# os.environ. setdefault() bridges the two for local .env-file-based dev
# without ever overwriting real env vars already set by the platform
# (e.g. Render injects these directly into the process environment).
if settings.langfuse_secret_key and settings.langfuse_public_key:
    os.environ.setdefault("LANGFUSE_SECRET_KEY", settings.langfuse_secret_key)
    os.environ.setdefault("LANGFUSE_PUBLIC_KEY", settings.langfuse_public_key)
    os.environ.setdefault("LANGFUSE_BASE_URL", settings.langfuse_base_url)
