from datetime import datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """모든 필드를 camelCase로 직렬화(프론트엔드 JS 관례에 맞춤), 내부적으로는 snake_case 유지."""
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class LoginRequest(BaseModel):
    password: str


class TokenResponse(CamelModel):
    token: str


class ConfigResponse(CamelModel):
    naver_client_id: str


class DatasetItemIn(BaseModel):
    address: str
    label: str = ""


class DatasetCreate(BaseModel):
    name: str
    rows: list[DatasetItemIn]


class DatasetItemOut(CamelModel):
    id: int
    address: str
    label: str | None = None
    lat: float | None = None
    lng: float | None = None
    sido: str | None = None
    sigugun: str | None = None
    dong: str | None = None
    road_name: str | None = None
    building_no: str | None = None
    ok: bool
    ev_nearby: bool


class DatasetSummary(CamelModel):
    id: int
    name: str
    file_name: str | None = None
    item_count: int
    ok_count: int
    updated_at: datetime


class DatasetOut(CamelModel):
    id: int
    name: str
    file_name: str | None = None
    items: list[DatasetItemOut]
    updated_at: datetime


class MemoUpdate(BaseModel):
    memo: str


class PhotoOut(CamelModel):
    id: int
    address: str
    original_name: str | None = None
    uploaded_at: datetime


class PlaceOut(CamelModel):
    address: str
    memo: str
    photos: list[PhotoOut]


class EvStationIn(BaseModel):
    address: str
    name: str = ""


class EvStationsReplace(BaseModel):
    stations: list[EvStationIn]


class EvCheckResult(CamelModel):
    total_stations: int
    checked_items: int
    matched: int
