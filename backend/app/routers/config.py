from fastapi import APIRouter, Depends

from ..auth import verify_token
from ..config import get_settings
from ..schemas import ConfigResponse

router = APIRouter(prefix="/api", tags=["config"], dependencies=[Depends(verify_token)])
settings = get_settings()


@router.get("/config", response_model=ConfigResponse)
def get_config():
    return ConfigResponse(naver_client_id=settings.naver_client_id)
