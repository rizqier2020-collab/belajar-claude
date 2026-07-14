from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_roles
from ..constants import LEAVE_TYPES, QUOTA_LEAVE_TYPES
from ..database import get_db
from ..models import LeaveApproval, LeaveBalance, LeaveRequest, User
from ..schemas import (
    ActionRequest,
    LeaveBalanceOut,
    LeaveBalanceUpdate,
    LeaveCreate,
    LeaveOut,
)
from ..services import (
    calc_working_days,
    first_approver,
    generate_request_number,
    resolve_approval_chain,
)

router = APIRouter(prefix="/api/leaves", tags=["leaves"])


def _approver_level(approver: User) -> int:
    return 2 if approver.role == "director" else 1


# ---------- Balances (harus sebelum route /{id}) ----------
@router.get("/balances", response_model=list[LeaveBalanceOut])
def get_balances(
    year: int | None = None,
    user_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(LeaveBalance)
    if current_user.role == "admin":
        if user_id:
            q = q.filter(LeaveBalance.user_id == user_id)
    else:
        q = q.filter(LeaveBalance.user_id == current_user.id)
    if year:
        q = q.filter(LeaveBalance.year == year)
    return q.order_by(LeaveBalance.user_id, LeaveBalance.leave_type).all()


@router.put("/balances/{balance_id}", response_model=LeaveBalanceOut)
def update_balance(
    balance_id: int,
    payload: LeaveBalanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    balance = db.query(LeaveBalance).filter(LeaveBalance.id == balance_id).first()
    if not balance:
        raise HTTPException(status_code=404, detail="Kuota tidak ditemukan")
    balance.quota = payload.quota
    db.commit()
    db.refresh(balance)
    return balance


# ---------- Leave requests ----------
@router.get("", response_model=list[LeaveOut])
def list_leaves(
    status: str | None = None,
    user_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(LeaveRequest)
    if current_user.role == "admin":
        if user_id:
            q = q.filter(LeaveRequest.user_id == user_id)
    else:
        # Non-admin melihat pengajuan miliknya sendiri.
        q = q.filter(LeaveRequest.user_id == current_user.id)
    if status:
        q = q.filter(LeaveRequest.status == status)
    return q.order_by(LeaveRequest.created_at.desc()).all()


@router.get("/pending-approvals", response_model=list[LeaveOut])
def pending_approvals(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("manager", "director", "admin")),
):
    """Pengajuan cuti yang menunggu approval dari user ini."""
    return (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.current_approver_id == current_user.id,
            LeaveRequest.status.in_(["pending", "approved_l1"]),
        )
        .order_by(LeaveRequest.created_at.desc())
        .all()
    )


@router.get("/{leave_id}", response_model=LeaveOut)
def get_leave(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Pengajuan tidak ditemukan")
    if current_user.role != "admin" and leave.user_id != current_user.id:
        # Approver dalam rantai juga boleh melihat.
        if leave.current_approver_id != current_user.id:
            is_in_chain = any(
                a.approver_id == current_user.id for a in leave.approvals
            )
            if not is_in_chain:
                raise HTTPException(status_code=403, detail="Tidak memiliki akses")
    return leave


@router.post("", response_model=LeaveOut, status_code=201)
def create_leave(
    payload: LeaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.leave_type not in LEAVE_TYPES:
        raise HTTPException(status_code=400, detail="Jenis cuti tidak valid")

    # Validasi tanggal.
    if payload.start_date < date.today():
        raise HTTPException(status_code=400, detail="Tanggal mulai tidak boleh di masa lalu")
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="Tanggal selesai harus >= tanggal mulai")

    # Cuti melahirkan khusus perempuan.
    if payload.leave_type == "CK" and current_user.gender != "female":
        raise HTTPException(status_code=400, detail="Cuti melahirkan khusus karyawan perempuan")

    total_days = calc_working_days(payload.start_date, payload.end_date, db)
    if total_days <= 0:
        raise HTTPException(
            status_code=400,
            detail="Rentang tanggal tidak mengandung hari kerja (cek weekend/libur)",
        )

    # Cuti sakit > 1 hari wajib lampiran surat dokter.
    if payload.leave_type == "CS" and total_days > 1 and not payload.attachment_path:
        raise HTTPException(
            status_code=400, detail="Cuti sakit lebih dari 1 hari wajib lampiran surat dokter"
        )

    # Cek kuota untuk jenis cuti yang memotong kuota.
    if payload.leave_type in QUOTA_LEAVE_TYPES:
        year = payload.start_date.year
        balance = (
            db.query(LeaveBalance)
            .filter(
                LeaveBalance.user_id == current_user.id,
                LeaveBalance.leave_type == payload.leave_type,
                LeaveBalance.year == year,
            )
            .first()
        )
        quota = balance.quota if balance else LEAVE_TYPES[payload.leave_type]["default_quota"]
        used = balance.used if balance else 0
        if used + total_days > quota:
            raise HTTPException(
                status_code=400,
                detail=f"Kuota tidak mencukupi. Sisa: {quota - used} hari, diminta: {total_days} hari",
            )

    approver = first_approver(current_user)
    if approver is None:
        raise HTTPException(
            status_code=400,
            detail="Tidak ada approver yang dikonfigurasi. Hubungi admin.",
        )

    leave = LeaveRequest(
        request_number=generate_request_number(db, "LEAVE"),
        user_id=current_user.id,
        leave_type=payload.leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        total_days=total_days,
        reason=payload.reason,
        attachment_path=payload.attachment_path,
        status="pending",
        current_approver_id=approver.id,
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave


@router.put("/{leave_id}/cancel", response_model=LeaveOut)
def cancel_leave(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Pengajuan tidak ditemukan")
    if leave.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Tidak memiliki akses")
    if leave.status != "pending":
        raise HTTPException(status_code=400, detail="Hanya pengajuan berstatus pending yang bisa dibatalkan")
    leave.status = "cancelled"
    leave.current_approver_id = None
    db.commit()
    db.refresh(leave)
    return leave


@router.post("/{leave_id}/approve", response_model=LeaveOut)
def approve_leave(
    leave_id: int,
    payload: ActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("manager", "director", "admin")),
):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Pengajuan tidak ditemukan")
    if leave.status not in ("pending", "approved_l1"):
        raise HTTPException(status_code=400, detail="Pengajuan tidak dalam status yang bisa di-approve")

    is_admin_override = current_user.role == "admin"
    if not is_admin_override and leave.current_approver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bukan giliran Anda untuk approval")

    requester = db.query(User).filter(User.id == leave.user_id).first()
    chain = resolve_approval_chain(requester)

    level = _approver_level(current_user) if not is_admin_override else 2
    db.add(
        LeaveApproval(
            leave_request_id=leave.id,
            approver_id=current_user.id,
            action="approved",
            level=level,
            notes=payload.notes,
        )
    )

    # Tentukan approver berikutnya dalam rantai.
    next_approver = None
    if not is_admin_override:
        idx = next((i for i, a in enumerate(chain) if a.id == current_user.id), None)
        if idx is not None and idx + 1 < len(chain):
            next_approver = chain[idx + 1]

    if next_approver is not None:
        leave.status = "approved_l1"
        leave.current_approver_id = next_approver.id
    else:
        # Finalisasi.
        leave.status = "approved"
        leave.current_approver_id = None
        _apply_balance(leave, db)

    db.commit()
    db.refresh(leave)
    return leave


@router.post("/{leave_id}/reject", response_model=LeaveOut)
def reject_leave(
    leave_id: int,
    payload: ActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("manager", "director", "admin")),
):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Pengajuan tidak ditemukan")
    if leave.status not in ("pending", "approved_l1"):
        raise HTTPException(status_code=400, detail="Pengajuan tidak dalam status yang bisa di-reject")

    is_admin_override = current_user.role == "admin"
    if not is_admin_override and leave.current_approver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bukan giliran Anda untuk approval")

    level = _approver_level(current_user) if not is_admin_override else 2
    db.add(
        LeaveApproval(
            leave_request_id=leave.id,
            approver_id=current_user.id,
            action="rejected",
            level=level,
            notes=payload.notes,
        )
    )
    leave.status = "rejected"
    leave.current_approver_id = None
    db.commit()
    db.refresh(leave)
    return leave


def _apply_balance(leave: LeaveRequest, db: Session):
    """Update leave_balances.used setelah final approved (khusus jenis berkuota)."""
    if leave.leave_type not in QUOTA_LEAVE_TYPES:
        return
    year = leave.start_date.year
    balance = (
        db.query(LeaveBalance)
        .filter(
            LeaveBalance.user_id == leave.user_id,
            LeaveBalance.leave_type == leave.leave_type,
            LeaveBalance.year == year,
        )
        .first()
    )
    if balance is None:
        balance = LeaveBalance(
            user_id=leave.user_id,
            leave_type=leave.leave_type,
            year=year,
            quota=LEAVE_TYPES[leave.leave_type]["default_quota"] or 0,
            used=0,
        )
        db.add(balance)
    balance.used += leave.total_days
