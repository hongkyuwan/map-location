"""네이버 Geocoding REST API 호출.
https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode
v1(index.html)의 geocodeOnce/geocodeAddress 로직을 그대로 이식:
- 요청당 8초 타임아웃
- 타임아웃/네트워크 오류(=transient)만 최대 3회까지 재시도
- 정상 응답이지만 결과 없음(=notfound)은 재시도하지 않고 즉시 포기
"""
from dataclasses import dataclass

import httpx

from ..config import get_settings

settings = get_settings()

GEOCODE_URL = "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode"
TIMEOUT_SECONDS = 8.0
MAX_ATTEMPTS = 3


@dataclass
class GeocodeResult:
    lat: float
    lng: float
    sido: str | None
    sigugun: str | None
    dong: str | None
    road_name: str | None
    building_no: str | None


def _extract_element(elements: list[dict], type_name: str) -> str | None:
    for el in elements:
        if type_name in el.get("types", []):
            return el.get("longName")
    return None


async def _geocode_once(client: httpx.AsyncClient, address: str) -> tuple[bool, bool, GeocodeResult | None]:
    """반환: (성공 여부, 재시도 대상인지, 결과)"""
    headers = {
        "x-ncp-apigw-api-key-id": settings.naver_client_id,
        "x-ncp-apigw-api-key": settings.naver_client_secret,
        "Accept": "application/json",
    }
    try:
        resp = await client.get(
            GEOCODE_URL, params={"query": address}, headers=headers, timeout=TIMEOUT_SECONDS
        )
    except httpx.HTTPError:
        return False, True, None

    if resp.status_code != 200:
        return False, True, None

    data = resp.json()
    addresses = data.get("addresses", [])
    if not addresses:
        return False, False, None

    first = addresses[0]
    elements = first.get("addressElements", [])
    result = GeocodeResult(
        lat=float(first["y"]),
        lng=float(first["x"]),
        sido=_extract_element(elements, "SIDO"),
        sigugun=_extract_element(elements, "SIGUGUN"),
        dong=_extract_element(elements, "DONGMYUN"),
        road_name=_extract_element(elements, "ROAD_NAME"),
        building_no=_extract_element(elements, "BUILDING_NUMBER"),
    )
    return True, False, result


async def geocode_address(client: httpx.AsyncClient, address: str) -> GeocodeResult | None:
    for attempt in range(1, MAX_ATTEMPTS + 1):
        ok, transient, result = await _geocode_once(client, address)
        if ok:
            return result
        if not transient:
            return None
    return None
