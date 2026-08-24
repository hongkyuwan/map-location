from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import verify_token
from ..database import get_db
from ..models import Dataset, DatasetItem, EvStation
from ..schemas import DatasetCreate, DatasetItemOut, DatasetOut, DatasetSummary
from ..services.ev_match import find_nearby_station
from ..services.geocode import geocode_address

router = APIRouter(prefix="/api/datasets", tags=["datasets"], dependencies=[Depends(verify_token)])


async def _geocode_rows(rows: list[tuple[str, str]]) -> list[dict]:
    """rows: [(address, label), ...] -> DatasetItem 생성용 dict 목록"""
    results = []
    async with httpx.AsyncClient() as client:
        for address, label in rows:
            address = (address or "").strip()
            if not address:
                results.append({"address": "(빈 값)", "label": label, "ok": False})
                continue

            geo = await geocode_address(client, address)
            if geo:
                results.append({
                    "address": address,
                    "label": label,
                    "ok": True,
                    "lat": geo.lat,
                    "lng": geo.lng,
                    "sido": geo.sido,
                    "sigugun": geo.sigugun,
                    "dong": geo.dong,
                    "road_name": geo.road_name,
                    "building_no": geo.building_no,
                })
            else:
                results.append({"address": address, "label": label, "ok": False})
    return results


def _to_dataset_out(dataset: Dataset) -> DatasetOut:
    return DatasetOut(
        id=dataset.id,
        name=dataset.name,
        file_name=dataset.file_name,
        items=[DatasetItemOut.model_validate(i) for i in dataset.items],
        updated_at=dataset.updated_at,
    )


@router.post("", response_model=DatasetOut)
async def create_dataset(payload: DatasetCreate, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.name == payload.name).first()
    if dataset:
        db.query(DatasetItem).filter(DatasetItem.dataset_id == dataset.id).delete()
        dataset.updated_at = datetime.now(timezone.utc)
    else:
        dataset = Dataset(name=payload.name)
        db.add(dataset)
        db.flush()

    geocoded = await _geocode_rows([(r.address, r.label) for r in payload.rows])
    for g in geocoded:
        db.add(DatasetItem(dataset_id=dataset.id, **g))
    db.commit()
    db.refresh(dataset)
    return _to_dataset_out(dataset)


@router.get("", response_model=list[DatasetSummary])
def list_datasets(db: Session = Depends(get_db)):
    datasets = db.query(Dataset).order_by(Dataset.updated_at.desc()).all()
    return [
        DatasetSummary(
            id=d.id,
            name=d.name,
            file_name=d.file_name,
            item_count=len(d.items),
            ok_count=sum(1 for i in d.items if i.ok),
            updated_at=d.updated_at,
        )
        for d in datasets
    ]


@router.get("/{dataset_id}", response_model=DatasetOut)
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    return _to_dataset_out(dataset)


@router.put("/{dataset_id}/reconvert", response_model=DatasetOut)
async def reconvert_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    rows = [(i.address, i.label) for i in dataset.items]
    geocoded = await _geocode_rows(rows)

    db.query(DatasetItem).filter(DatasetItem.dataset_id == dataset.id).delete()
    for g in geocoded:
        db.add(DatasetItem(dataset_id=dataset.id, **g))
    dataset.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(dataset)
    return _to_dataset_out(dataset)


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    db.delete(dataset)
    db.commit()
    return {"ok": True}


@router.post("/{dataset_id}/ev-check")
def ev_check(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    stations = [{"address": s.address, "name": s.name} for s in db.query(EvStation).all()]
    if not stations:
        raise HTTPException(status_code=400, detail="저장된 충전소 데이터가 없습니다. 먼저 업로드해주세요.")

    matched = 0
    checked = 0
    for item in dataset.items:
        if not item.ok:
            continue
        checked += 1
        nearby = find_nearby_station(item.sigugun, item.dong, item.road_name, item.building_no, stations)
        item.ev_nearby = nearby
        if nearby:
            matched += 1
    db.commit()
    return {"totalStations": len(stations), "checkedItems": checked, "matched": matched}
