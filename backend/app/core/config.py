from functools import lru_cache
from typing import Any, List

from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    project_name: str = "FitBite API"
    api_v1_prefix: str = "/api"
    backend_cors_origins: List[AnyHttpUrl] | List[str] = ["http://localhost:5173", "http://localhost:3000"]

    database_url: str = "sqlite:///./app.db"

    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    @validator("backend_cors_origins", pre=True)
    def assemble_cors_origins(cls, value: Any) -> List[str]:  # type: ignore[override]
        if isinstance(value, str) and not value.startswith("["):
            return [origin.strip() for origin in value.split(",") if origin]
        if isinstance(value, list):
            return value
        raise ValueError(value)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
