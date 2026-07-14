from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_roles
from ..constants import (
    DIRECTOR_APPROVAL_THRESHOLD,
    MAX_RECEIPT_AGE_DAYS,
    REIMBURSEMENT_CATEGORIES,
)
from ..database import get_db
from ..models import ReimbursementApproval, ReimbursementRequest, User
from ..schemas import ActionRequest, ReimbursementCreate, ReimbursementOut
from ..services import generate_request_number, resolve_approval_chain

router = APIRouter(prefix="/api/reimbursements", tags=["reimbursements"])


def _approver_level(approver: User) -> int:
    return 2 if approver.role == "director" else 1


def _required_chain(requester: User, amount: Decimal) -> list[User]:
    """Rantai approver yang dibutuhkan berdasarkan nominal.
    > 500.000 wajib sampai Director; di bawahnya cukup approver pertama (Manager)."""
    full = resolve_approval_chain(requester)
    if amount > DIRECTOR_APPROVAL_THRESHOLD:
        return full
    return full[:1]


@router.get("", response_model=list[ReimbursementOut])
def list_reimbursements(
    status: str | None = None,
    user_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(ReimbursementRequest)
    if current_user.role == "admin":
        if user_id:
            q = q.filter(ReimbursementRequest.user_id == user_id)
    else:
        q = q.filter(ReimbursementRequest.user_id == current_user.id)
    if status:
        q = q.filter(ReimbursementRequest.status == status)
    return q.order_by(ReimbursementRequest.created_at.desc()).all()


@router.get("/pending-approvals", response_model=list[ReimbursementOut])
def pending_approvals(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("manager", "director", "admin")),
):
    return (
        db.query(ReimbursementRequest)
        .filter(
            ReimbursementRequest.current_approver_id == current_user.id,
            ReimbursementRequest.status.in_(["pending", "approved_l1"]),
        )
        .order_by(ReimbursementRequest.created_at.desc())
        .all()
    )


@router.get("/{reimb_id}", response_model=ReimbursementOut)
def get_reimbursement(
    reimb_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = db.query(ReimbursementRequest).filter(ReimbursementRequest.id == reimb_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Pengajuan tidak ditemukan")
    if current_user.role != "admin" and r.user_id != current_user.id:
        if r.current_approver_id != current_user.id:
            is_in_chain = any(a.approver_id == current_user.id for a in r.approvals)
            if not is_in_chain:
                raise HTTPException(status_code=403, detail="Tidak memiliki akses")
    return r


@router.post("", response_model=ReimbursementOut, status_code=201)
def create_reimbursement(
    payload: ReimbursementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.category not in REIMBURSEMENT_CATEGORIES:
        raise HTTPException(status_code=400, detail="Kategori tidak valid")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Nominal harus lebih dari 0")
    if not payload.receipt_path:
        raise HTTPException(status_code=400, detail="Bukti/nota wajib diupload")

    # receipt_date tidak boleh lebih dari 30 hari lalu, dan tidak boleh di masa depan.
    if payload.receipt_date > date.today():
        raise HTTPException(status_code=400, detail="Tanggal bukti tidak boleh di masa depan")
    if payload.receipt_date < date.today() - timedelta(days=MAX_RECEIPT_AGE_DAYS):
        raise HTTPException(
            status_code=400,
            detail=f"Tanggal bukti melebihi batas klaim {MAX_RECEIPT_AGE_DAYS} hari",
        )

    chain = _required_chain(current_user, payload.amount)
    if not chain:
        raise HTTPException(
            status_code=400, detail="Tidak ada approver yang dikonfigurasi. Hubungi admin."
        )

    r = ReimbursementRequest(
        request_number=generate_request_number(db, "REIMB"),
        user_id=current_user.id,
        category=payload.category,
        amount=payload.amount,
        description=payload.description,
        receipt_date=payload.receipt_date,
        receipt_path=payload.receipt_path,
        project_code=payload.project_code,
        status="pending",
        current_approver_id=chain[0].id,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@router.put("/{reimb_id}/cancel", response_model=ReimbursementOut)
def cancel_reimbursement(
    reimb_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = db.query(ReimbursementRequest).filter(ReimbursementRequest.id == reimb_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Pengajuan tidak ditemukan")
    if r.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Tidak memiliki akses")
    if r.status != "pending":
        raise HTTPException(status_code=400, detail="Hanya pengajuan pending yang bisa dibatalkan")
    r.status = "cancelled"
    r.current_approver_id = None
    db.commit()
    db.refresh(r)
    return r


@router.post("/{reimb_id}/approve", response_model=ReimbursementOut)
def approve_reimbursement(
    reimb_id: int,
    payload: ActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("manager", "director", "admin")),
):
    r = db.query(ReimbursementRequest).filter(ReimbursementRequest.id == reimb_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Pengajuan tidak ditemukan")
    if r.status not in ("pending", "approved_l1"):
        raise HTTPException(status_code=400, detail="Pengajuan tidak dalam status yang bisa di-approve")

    is_admin_override = current_user.role == "admin"
    if not is_admin_override and r.current_approver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bukan giliran Anda untuk approval")

    requester = db.query(User).filter(User.id == r.user_id).first()
    chain = _required_chain(requester, Decimal(r.amount))

    level = _approver_level(current_user) if not is_admin_override else 2
    db.add(
        ReimbursementApproval(
            reimbursement_request_id=r.id,
            approver_id=current_user.id,
            action="approved",
            level=level,
            notes=payload.notes,
        )
    )

    next_approver = None
    if not is_admin_override:
        idx = next((i for i, a in enumerate(chain) if a.id == current_user.id), None)
        if idx is not None and idx + 1 < len(chain):
            next_approver = chain[idx + 1]

    if next_approver is not None:
        r.status = "approved_l1"
        r.current_approver_id = next_approver.id
    else:
        r.status = "approved"
        r.current_approver_id = None

    db.commit()
    db.refresh(r)
    return r


@router.post("/{reimb_id}/reject", response_model=ReimbursementOut)
def reject_reimbursement(
    reimb_id: int,
    payload: ActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("manager", "director", "admin")),
):
    r = db.query(ReimbursementRequest).filter(ReimbursementRequest.id == reimb_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Pengajuan tidak ditemukan")
    if r.status not in ("pending", "approved_l1"):
        raise HTTPException(status_code=400, detail="Pengajuan tidak dalam status yang bisa di-reject")

    is_admin_override = current_user.role == "admin"
    if not is_admin_override and r.current_approver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bukan giliran Anda untuk approval")

    level = _approver_level(current_user) if not is_admin_override else 2
    db.add(
        ReimbursementApproval(
            reimbursement_request_id=r.id,
            approver_id=current_user.id,
            action="rejected",
            level=level,
            notes=payload.notes,
        )
    )
    r.status = "rejected"
    r.current_approver_id = None
    db.commit()
    db.refresh(r)
    return r


@router.put("/{reimb_id}/paid", response_model=ReimbursementOut)
def mark_paid(
    reimb_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    r = db.query(ReimbursementRequest).filter(ReimbursementRequest.id == reimb_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Pengajuan tidak ditemukan")
    if r.status != "approved":
        raise HTTPException(status_code=400, detail="Hanya pengajuan approved yang bisa ditandai paid")
    r.status = "paid"
    r.paid_date = date.today()
    db.commit()
    db.refresh(r)
    return r
