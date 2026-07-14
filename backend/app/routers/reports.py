import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import extract
from sqlalchemy.orm import Session

from ..auth import require_roles
from ..constants import LEAVE_TYPES, REIMBURSEMENT_CATEGORIES
from ..database import get_db
from ..models import LeaveRequest, ReimbursementRequest, User

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _csv_response(rows: list[list], header: list[str], filename: str) -> StreamingResponse:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(header)
    writer.writerows(rows)
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/leaves")
def report_leaves(
    year: int,
    month: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    q = db.query(LeaveRequest).filter(extract("year", LeaveRequest.start_date) == year)
    if month:
        q = q.filter(extract("month", LeaveRequest.start_date) == month)
    leaves = q.order_by(LeaveRequest.start_date).all()

    header = [
        "No. Pengajuan", "NIK", "Nama", "Jenis Cuti", "Tanggal Mulai",
        "Tanggal Selesai", "Total Hari", "Alasan", "Status",
    ]
    rows = []
    for l in leaves:
        rows.append([
            l.request_number,
            l.user.employee_id if l.user else "",
            l.user.full_name if l.user else "",
            LEAVE_TYPES.get(l.leave_type, {}).get("name", l.leave_type),
            l.start_date.isoformat(),
            l.end_date.isoformat(),
            l.total_days,
            l.reason or "",
            l.status,
        ])
    suffix = f"{year}-{month:02d}" if month else str(year)
    return _csv_response(rows, header, f"laporan-cuti-{suffix}.csv")


@router.get("/reimbursements")
def report_reimbursements(
    year: int,
    month: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    q = db.query(ReimbursementRequest).filter(
        extract("year", ReimbursementRequest.receipt_date) == year
    )
    if month:
        q = q.filter(extract("month", ReimbursementRequest.receipt_date) == month)
    items = q.order_by(ReimbursementRequest.receipt_date).all()

    header = [
        "No. Pengajuan", "NIK", "Nama", "Kategori", "Nominal", "Tanggal Bukti",
        "Deskripsi", "Kode Proyek", "Status", "Tanggal Bayar",
    ]
    rows = []
    for r in items:
        rows.append([
            r.request_number,
            r.user.employee_id if r.user else "",
            r.user.full_name if r.user else "",
            REIMBURSEMENT_CATEGORIES.get(r.category, r.category),
            f"{r.amount:.2f}",
            r.receipt_date.isoformat(),
            r.description,
            r.project_code or "",
            r.status,
            r.paid_date.isoformat() if r.paid_date else "",
        ])
    suffix = f"{year}-{month:02d}" if month else str(year)
    return _csv_response(rows, header, f"laporan-reimbursement-{suffix}.csv")
