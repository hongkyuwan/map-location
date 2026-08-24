"""전기차 충전소 인근 판정. v1(index.html)의 findNearbyStation 로직을 그대로 이식.
좌표 지오코딩 없이 주소 텍스트만으로 판정한다 (충전소 CSV가 수십만 행이어도 API 호출이 없음).
같은 시/군/구+동+도로명을 먼저 찾고, 도로명 뒤 건물번호를 뽑을 수 있으면 ±30 범위로 한 번 더 좁힌다.
"""
import re

BUILDING_NO_RANGE = 30


def find_nearby_station(
    sigugun: str | None,
    dong: str | None,
    road_name: str | None,
    building_no: str | None,
    stations: list[dict],
) -> bool:
    sigugun = sigugun or ""
    dong = dong or ""
    road_name = road_name or ""
    if not dong and not road_name:
        return False

    candidates = [
        s for s in stations
        if (not sigugun or sigugun in s["address"])
        and (not dong or dong in s["address"])
        and (not road_name or road_name in s["address"])
    ]
    if not candidates:
        return False
    if not road_name or not building_no:
        return True

    try:
        target_no = int(building_no)
    except (TypeError, ValueError):
        return True

    pattern = re.compile(re.escape(road_name) + r"\s*(\d+)")
    for s in candidates:
        m = pattern.search(s["address"])
        if not m:
            return True
        if abs(int(m.group(1)) - target_no) <= BUILDING_NO_RANGE:
            return True
    return False
