from functools import lru_cache
import json
from typing import Any, List

from pydantic import AnyHttpUrl, BaseModel, Field, validator
from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_GENERIC_DISCOUNT = 0.15


class DiscountCodeSetting(BaseModel):
    code: str = Field(..., min_length=1, description="Nuolaidos kodo reikšmė.")
    percent: float = Field(default=DEFAULT_GENERIC_DISCOUNT, ge=0, le=1, description="Nuolaidos dydis (0-1).")


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    project_name: str = "FitBite API"
    api_v1_prefix: str = "/api"
    backend_cors_origins: List[AnyHttpUrl] | List[str] = ["http://localhost:5173", "http://localhost:3000"]

    database_url: str = "sqlite:///./app.db"

    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    generic_discount_codes: List[DiscountCodeSetting] = []

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    @validator("backend_cors_origins", pre=True)
    def assemble_cors_origins(cls, value: Any) -> List[str]:  # type: ignore[override]
        if isinstance(value, str) and not value.startswith("["):
            return [origin.strip() for origin in value.split(",") if origin]
        if isinstance(value, list):
            return value
        raise ValueError(value)

    @validator("generic_discount_codes", pre=True)
    def parse_generic_discount_codes(cls, value: Any) -> List[dict[str, Any]]:  # type: ignore[override]
        if not value:
            return []

        raw_entries: List[Any]
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []
            if stripped.startswith("["):
                try:
                    raw_entries = json.loads(stripped)
                except json.JSONDecodeError as exc:  # pragma: no cover - config error path
                    raise ValueError(
                        "GENERIC_DISCOUNT_CODES turi būti JSON sąrašas arba kableliais atskirti kodai."
                    ) from exc
            else:
                raw_entries = [token.strip() for token in stripped.split(",")]
        elif isinstance(value, list):
            raw_entries = value
        else:
            raise ValueError(value)

        processed: List[dict[str, Any]] = []
        seen: set[str] = set()

        for entry in raw_entries:
            if isinstance(entry, str):
                code = entry.strip().upper()
                percent = DEFAULT_GENERIC_DISCOUNT
            elif isinstance(entry, dict):
                code = str(entry.get("code", "")).strip().upper()
                percent = entry.get("percent", DEFAULT_GENERIC_DISCOUNT)
            else:
                continue

            if not code or code in seen:
                continue
            seen.add(code)

            try:
                percent_value = float(percent)
            except (TypeError, ValueError):
                percent_value = DEFAULT_GENERIC_DISCOUNT

            if percent_value < 0:
                percent_value = 0

            processed.append({"code": code, "percent": percent_value})

        return processed


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
