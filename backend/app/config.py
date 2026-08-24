import os
from functools import lru_cache


class Settings:
    database_url: str = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://maplocation:maplocation@db:3306/maplocation?charset=utf8mb4",
    )
    naver_client_id: str = os.getenv("NAVER_CLIENT_ID", "")
    naver_client_secret: str = os.getenv("NAVER_CLIENT_SECRET", "")
    auth_password: str = os.getenv("AUTH_PASSWORD", "")
    jwt_secret: str = os.getenv("JWT_SECRET", "change-me")
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))
    photo_storage_dir: str = os.getenv("PHOTO_STORAGE_DIR", "/app/storage/photos")
    cors_origins: list[str] = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")


@lru_cache
def get_settings() -> Settings:
    return Settings()
