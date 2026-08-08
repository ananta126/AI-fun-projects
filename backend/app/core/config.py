"""
core/config.py — Application Settings

Purpose:
    Loads all configuration from environment variables (.env file).
    Every other module reads settings from here instead of hardcoding values.

Why it exists:
    Keeps secrets (JWT key, DB password) out of source code.
    Change DATABASE_URL in .env → entire app uses the new database.

How Flutter uses this (indirectly):
    Flutter never reads this file. But the JWT_SECRET_KEY here is what
    signs tokens that Flutter stores and sends back on every request.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All environment variables the backend needs."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Allow Phase 4 LLM vars in .env without failing startup
    )

    # Application
    app_name: str = "AI Communication POC"
    debug: bool = True

    # Database — async PostgreSQL connection string
    database_url: str = (
        "postgresql+asyncpg://ai_comm:ai_comm_dev@localhost:5432/ai_comm_db"
    )

    # JWT Authentication
    jwt_secret_key: str = "change-me-to-a-long-random-string"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    # CORS — Flutter app origins allowed to call this API
    cors_origins: list[str] = ["*"]

    # AI / LLM (used in Phase 4; loaded now so .env stays valid)
    llm_api_base_url: str = "https://api.openai.com/v1"
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"


# Single shared instance — import this everywhere
settings = Settings()
