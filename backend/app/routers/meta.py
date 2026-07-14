from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..constants import LEAVE_TYPES, REIMBURSEMENT_CATEGORIES
from ..database import get_db
from ..models import LeaveRequest, ReimbursementRequest, User

router = APIRouter(prefix="/api/meta", tags=["meta"])


@router.get("/leave-types")
def leave_types():
    return [
        {"code": code, "name": info["name"], "keterangan": info["keterangan"],
         "default_quota": info["default_quota"]}
        for code, info in LEAVE_TYPES.items()
    ]


@router.get("/reimbursement-categories")
def reimbursement_categories():
    return [{"code": code, "name": name} for code, name in REIMBURSEMENT_CATEGORIES.items()]


@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ringkasan untuk dashboard: pengajuan aktif milik user + jumlah pending approval."""
    my_leaves = db.query(LeaveRequest).filter(LeaveRequest.user_id == current_user.id)
    my_reimb = db.query(ReimbursementRequest).filter(
        ReimbursementRequest.user_id == current_user.id
    )

    active_statuses = ["pending", "approved_l1"]
    summary = {
        "my_leaves_total": my_leaves.count(),
        "my_leaves_pending": my_leaves.filter(LeaveRequest.status.in_(active_statuses)).count(),
        "my_leaves_approved": my_leaves.filter(LeaveRequest.status == "approved").count(),
        "my_reimb_total": my_reimb.count(),
        "my_reimb_pending": my_reimb.filter(
            ReimbursementRequest.status.in_(active_statuses)
        ).count(),
        "my_reimb_approved": my_reimb.filter(
            ReimbursementRequest.status.in_(["approved", "paid"])
        ).count(),
        "pending_leave_approvals": 0,
        "pending_reimb_approvals": 0,
    }

    if current_user.role in ("manager", "director", "admin"):
        summary["pending_leave_approvals"] = (
            db.query(LeaveRequest)
            .filter(
                LeaveRequest.current_approver_id == current_user.id,
                LeaveRequest.status.in_(active_statuses),
            )
            .count()
        )
        summary["pending_reimb_approvals"] = (
            db.query(ReimbursementRequest)
            .filter(
                ReimbursementRequest.current_approver_id == current_user.id,
                ReimbursementRequest.status.in_(active_statuses),
            )
            .count()
        )

    return summary
