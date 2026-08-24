import os
import uuid

from .config import get_settings

settings = get_settings()


def ensure_storage_dir() -> None:
    os.makedirs(settings.photo_storage_dir, exist_ok=True)


def save_photo(file_bytes: bytes, original_name: str) -> str:
    ensure_storage_dir()
    ext = os.path.splitext(original_name or "")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(settings.photo_storage_dir, filename)
    with open(path, "wb") as f:
        f.write(file_bytes)
    return path


def delete_photo_file(path: str) -> None:
    try:
        os.remove(path)
    except OSError:
        pass
