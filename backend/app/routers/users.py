from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user, hash_password, require_roles
from ..constants import LEAVE_TYPES, ROLES
from ..database import get_db
from ..models import LeaveBalance, User
from ..schemas import UserBrief, UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    return db.query(User).order_by(User.id).all()


@router.get("/approvers", response_model=list[UserBrief])
def list_approvers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Daftar kandidat approver (manager/director/admin) untuk dropdown."""
    return (
        db.query(User)
        .filter(User.role.in_(["manager", "director", "admin"]), User.is_active == True)  # noqa: E712
        .order_by(User.full_name)
        .all()
    )


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    if payload.role not in ROLES:
        raise HTTPException(status_code=400, detail="Role tidak valid")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    if db.query(User).filter(User.employee_id == payload.employee_id).first():
        raise HTTPException(status_code=400, detail="NIK sudah terdaftar")

    user = User(
        employee_id=payload.employee_id,
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        department=payload.department,
        gender=payload.gender,
        join_date=payload.join_date,
        approver_id=payload.approver_id,
        is_active=payload.is_active,
    )
    db.add(user)
    db.flush()

    # Buat default leave balance cuti tahunan untuk tahun berjalan.
    year = date.today().year
    db.add(
        LeaveBalance(
            user_id=user.id,
            leave_type="CT",
            year=year,
            quota=LEAVE_TYPES["CT"]["default_quota"],
            used=0,
        )
    )
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Karyawan tidak ditemukan")

    data = payload.model_dump(exclude_unset=True)
    if "role" in data and data["role"] not in ROLES:
        raise HTTPException(status_code=400, detail="Role tidak valid")
    if "email" in data:
        existing = db.query(User).filter(User.email == data["email"], User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email sudah digunakan")
    if "password" in data and data["password"]:
        user.password_hash = hash_password(data.pop("password"))
    else:
        data.pop("password", None)

    for field, value in data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user
