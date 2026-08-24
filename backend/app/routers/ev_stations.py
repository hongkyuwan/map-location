from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import verify_token
from ..database import get_db
from ..models import EvStation
from ..schemas import EvStationsReplace

router = APIRouter(prefix="/api/ev-stations", tags=["ev-stations"], dependencies=[Depends(verify_token)])


@router.put("")
def replace_stations(payload: EvStationsReplace, db: Session = Depends(get_db)):
    db.query(EvStation).delete()
    for s in payload.stations:
        address = s.address.strip()
        if address:
            db.add(EvStation(address=address, name=s.name or ""))
    db.commit()
    count = db.query(EvStation).count()
    return {"count": count}


@router.get("")
def get_stations_summary(db: Session = Depends(get_db)):
    return {"count": db.query(EvStation).count()}
