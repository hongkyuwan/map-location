from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from .config import get_settings

settings = get_settings()
bearer_scheme = HTTPBearer()


def create_token() -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": "user", "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> None:
    try:
        jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="로그인이 만료되었습니다. 다시 로그인해주세요.")
