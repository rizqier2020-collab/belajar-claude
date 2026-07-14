from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_roles
from ..database import get_db
from ..models import Holiday, User
from ..schemas import HolidayCreate, HolidayOut

router = APIRouter(prefix="/api/holidays", tags=["holidays"])


@router.get("", response_model=list[HolidayOut])
def list_holidays(
    year: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Holiday)
    if year:
        q = q.filter(Holiday.year == year)
    return q.order_by(Holiday.holiday_date).all()


@router.post("", response_model=HolidayOut, status_code=201)
def create_holiday(
    payload: HolidayCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    if db.query(Holiday).filter(Holiday.holiday_date == payload.holiday_date).first():
        raise HTTPException(status_code=400, detail="Hari libur pada tanggal itu sudah ada")
    holiday = Holiday(
        holiday_date=payload.holiday_date,
        description=payload.description,
        year=payload.holiday_date.year,
    )
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    return holiday


@router.delete("/{holiday_id}", status_code=204)
def delete_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    holiday = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(status_code=404, detail="Hari libur tidak ditemukan")
    db.delete(holiday)
    db.commit()
