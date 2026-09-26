from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Career Track v2"
    secret_key: str = "change-me"
    database_url: str = "sqlite:///./data/career_track.db"
    access_token_minutes: int = 10080
    cors_origins: str = "http://localhost:8000,http://127.0.0.1:8000"
    upload_dir: str = "./data/uploads"
    max_upload_mb: int = 10

    ai_enabled: bool = True
    ai_base_url: str = "http://127.0.0.1:11434"
    ai_model: str = "qwen2.5:7b"
    ai_api_key: str = ""
    ai_timeout_seconds: int = 90

    search_max_results: int = 12
    scrape_max_chars: int = 30000
    scrape_timeout_seconds: int = 15
    user_agent: str = "CareerTrackScholarshipResearch/2.0"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]

    @property
    def upload_path(self) -> Path:
        path = Path(self.upload_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path


@lru_cache
def get_settings() -> Settings:
    return Settings()
