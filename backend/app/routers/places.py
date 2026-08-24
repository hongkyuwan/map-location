import os

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..auth import verify_token
from ..database import get_db
from ..models import Photo, Place
from ..schemas import MemoUpdate, PhotoOut, PlaceOut
from ..storage import delete_photo_file, save_photo

router = APIRouter(prefix="/api", tags=["places"], dependencies=[Depends(verify_token)])


def _get_or_create_place(db: Session, address: str) -> Place:
    place = db.get(Place, address)
    if not place:
        place = Place(address=address, memo="")
        db.add(place)
        db.commit()
        db.refresh(place)
    return place


def _to_place_out(place: Place) -> PlaceOut:
    return PlaceOut(
        address=place.address,
        memo=place.memo or "",
        photos=[PhotoOut.model_validate(p) for p in place.photos],
    )


@router.get("/places/has-notes")
def bulk_has_notes(addresses: str = Query(..., description="쉼표로 구분한 주소 목록"), db: Session = Depends(get_db)):
    """마커 렌더링 시 메모/사진이 있는 장소를 한 번에 조회 (주소마다 개별 호출하지 않도록)."""
    address_list = [a for a in addresses.split(",") if a]
    if not address_list:
        return {"addresses": []}

    places = (
        db.query(Place)
        .filter(Place.address.in_(address_list))
        .filter(or_(Place.memo.isnot(None), Place.photos.any()))
        .all()
    )
    result = []
    for p in places:
        if (p.memo and p.memo.strip()) or len(p.photos) > 0:
            result.append(p.address)
    return {"addresses": result}


@router.get("/places/{address}", response_model=PlaceOut)
def get_place(address: str, db: Session = Depends(get_db)):
    place = db.get(Place, address)
    if not place:
        return PlaceOut(address=address, memo="", photos=[])
    return _to_place_out(place)


@router.put("/places/{address}/memo", response_model=PlaceOut)
def update_memo(address: str, payload: MemoUpdate, db: Session = Depends(get_db)):
    place = _get_or_create_place(db, address)
    place.memo = payload.memo
    db.commit()
    db.refresh(place)
    return _to_place_out(place)


@router.post("/places/{address}/photos", response_model=PhotoOut)
async def upload_photo(address: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    _get_or_create_place(db, address)
    content = await file.read()
    path = save_photo(content, file.filename or "photo.jpg")
    photo = Photo(address=address, file_path=path, original_name=file.filename)
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return PhotoOut.model_validate(photo)


@router.get("/photos/{photo_id}")
def get_photo_file(photo_id: int, db: Session = Depends(get_db)):
    photo = db.get(Photo, photo_id)
    if not photo or not os.path.exists(photo.file_path):
        raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다.")
    return FileResponse(photo.file_path)


@router.delete("/photos/{photo_id}")
def delete_photo(photo_id: int, db: Session = Depends(get_db)):
    photo = db.get(Photo, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다.")
    delete_photo_file(photo.file_path)
    db.delete(photo)
    db.commit()
    return {"ok": True}
