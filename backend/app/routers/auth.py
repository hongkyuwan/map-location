from fastapi import APIRouter, HTTPException, status

from ..auth import create_token
from ..config import get_settings
from ..schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    if not settings.auth_password or payload.password != settings.auth_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="비밀번호가 올바르지 않습니다.")
    return TokenResponse(token=create_token())
