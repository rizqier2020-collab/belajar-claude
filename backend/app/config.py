from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database: gunakan SQLite untuk development, PostgreSQL untuk production.
    database_url: str = "sqlite:///./jfp.db"

    # JWT
    secret_key: str = "change-this-secret-key-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8  # 8 jam kerja

    # File upload
    upload_dir: str = "uploads"
    max_upload_size: int = 5 * 1024 * 1024  # 5 MB
    allowed_extensions: str = "jpg,jpeg,png,pdf"

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def allowed_extensions_list(self) -> list[str]:
        return [e.strip().lower() for e in self.allowed_extensions.split(",")]

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
