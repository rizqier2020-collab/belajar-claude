"""Helper logika bisnis: hitung hari kerja, generate nomor request, routing approval."""

from datetime import date, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from .models import Holiday, LeaveRequest, ReimbursementRequest, User


def calc_working_days(start: date, end: date, db: Session) -> int:
    """Hitung total hari kerja antara start dan end (inklusif),
    exclude Sabtu-Minggu dan hari libur nasional."""
    holidays = {
        h.holiday_date
        for h in db.query(Holiday)
        .filter(Holiday.holiday_date >= start, Holiday.holiday_date <= end)
        .all()
    }
    total = 0
    current = start
    while current <= end:
        # weekday(): Senin=0 ... Sabtu=5, Minggu=6
        if current.weekday() < 5 and current not in holidays:
            total += 1
        current += timedelta(days=1)
    return total


def generate_request_number(db: Session, kind: str) -> str:
    """kind: 'LEAVE' atau 'REIMB'. Format: LEAVE-2026-0001."""
    year = date.today().year
    if kind == "LEAVE":
        model = LeaveRequest
        prefix = "LEAVE"
    else:
        model = ReimbursementRequest
        prefix = "REIMB"

    count = (
        db.query(func.count(model.id))
        .filter(model.request_number.like(f"{prefix}-{year}-%"))
        .scalar()
    )
    seq = (count or 0) + 1
    return f"{prefix}-{year}-{seq:04d}"


def resolve_approval_chain(user: User) -> list[User]:
    """Kembalikan urutan approver: manager (level 1) lalu director (level 2).
    Jika user langsung di bawah director, hanya director. Menelusuri approver_id."""
    chain: list[User] = []
    current = user.approver
    visited = set()
    while current is not None and current.id not in visited:
        visited.add(current.id)
        if current.role in ("manager", "director"):
            chain.append(current)
        # Berhenti setelah menemukan director (approval final).
        if current.role == "director":
            break
        current = current.approver
    return chain


def first_approver(user: User) -> User | None:
    chain = resolve_approval_chain(user)
    return chain[0] if chain else None
