"""Seeder data awal untuk sistem JFP Leave & Reimbursement.

Jalankan: python seed.py
Membuat: admin, direktur, manager, karyawan sample, hari libur nasional 2026,
kuota cuti default, serta beberapa sample pengajuan di berbagai status.

Semua akun default memakai password: password123
"""

from datetime import date, timedelta

from app.database import Base, SessionLocal, engine
from app.auth import hash_password
from app.constants import LEAVE_TYPES
from app.models import (
    Holiday,
    LeaveApproval,
    LeaveBalance,
    LeaveRequest,
    ReimbursementRequest,
    User,
)
from app.services import calc_working_days

YEAR = 2026
DEFAULT_PASSWORD = "password123"

# Hari libur nasional Indonesia 2026 (indikatif — admin dapat menyesuaikan
# via menu Holiday Management setelah penetapan SKB resmi).
HOLIDAYS_2026 = [
    (date(2026, 1, 1), "Tahun Baru Masehi"),
    (date(2026, 2, 17), "Tahun Baru Imlek 2577"),
    (date(2026, 3, 19), "Hari Suci Nyepi (Tahun Baru Saka 1948)"),
    (date(2026, 3, 20), "Idul Fitri 1447 H"),
    (date(2026, 3, 21), "Idul Fitri 1447 H"),
    (date(2026, 4, 3), "Wafat Isa Almasih"),
    (date(2026, 5, 1), "Hari Buruh Internasional"),
    (date(2026, 5, 14), "Kenaikan Isa Almasih"),
    (date(2026, 5, 27), "Idul Adha 1447 H"),
    (date(2026, 6, 1), "Hari Lahir Pancasila"),
    (date(2026, 6, 16), "Tahun Baru Islam 1448 H"),
    (date(2026, 8, 17), "Hari Kemerdekaan RI"),
    (date(2026, 8, 25), "Maulid Nabi Muhammad SAW"),
    (date(2026, 12, 25), "Hari Raya Natal"),
]


def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def seed():
    reset_db()
    db = SessionLocal()
    try:
        # ---------- Users ----------
        def make_user(**kw):
            u = User(password_hash=hash_password(DEFAULT_PASSWORD), **kw)
            db.add(u)
            db.flush()
            return u

        admin = make_user(
            employee_id="JFP-001", full_name="Rizqi", email="rizqi@jfp.co.id",
            role="admin", department="Finance, Accounting & Tax",
            join_date=date(2018, 1, 10), approver_id=None,
        )
        dirut = make_user(
            employee_id="JFP-002", full_name="Ir. Noordian Moeloek", email="noordian@jfp.co.id",
            role="director", department="Direksi", gender="male",
            join_date=date(2010, 5, 1), approver_id=None,
        )
        dirtek = make_user(
            employee_id="JFP-003", full_name="Teddy Rahmatullah", email="teddy@jfp.co.id",
            role="director", department="Direksi", gender="male",
            join_date=date(2011, 3, 15), approver_id=None,
        )
        # Manager (kepala divisi) melapor ke Direktur Teknis.
        budi = make_user(
            employee_id="JFP-004", full_name="Budi Santoso", email="budi@jfp.co.id",
            role="manager", department="Arsitektur", gender="male",
            join_date=date(2015, 7, 1), approver_id=dirtek.id,
        )
        # Karyawan di bawah manager Budi -> Budi -> Teddy.
        andi = make_user(
            employee_id="JFP-005", full_name="Andi Wijaya", email="andi@jfp.co.id",
            role="employee", department="Arsitektur", gender="male",
            join_date=date(2020, 2, 1), approver_id=budi.id,
        )
        siti = make_user(
            employee_id="JFP-006", full_name="Siti Nurhaliza", email="siti@jfp.co.id",
            role="employee", department="Engineering", gender="female",
            join_date=date(2021, 9, 1), approver_id=budi.id,
        )
        rudi = make_user(
            employee_id="JFP-007", full_name="Rudi Hartono", email="rudi@jfp.co.id",
            role="employee", department="Drafting", gender="male",
            join_date=date(2022, 1, 15), approver_id=budi.id,
        )
        # Karyawan langsung di bawah Direktur (skip manager).
        dewi = make_user(
            employee_id="JFP-008", full_name="Dewi Lestari", email="dewi@jfp.co.id",
            role="employee", department="Finance, Accounting & Tax", gender="female",
            join_date=date(2019, 11, 1), approver_id=dirtek.id,
        )
        db.commit()

        employees = [admin, dirut, dirtek, budi, andi, siti, rudi, dewi]

        # ---------- Holidays ----------
        for d, desc in HOLIDAYS_2026:
            db.add(Holiday(holiday_date=d, description=desc, year=d.year))
        db.commit()

        # ---------- Leave balances (cuti tahunan 12 hari untuk semua) ----------
        for u in employees:
            db.add(
                LeaveBalance(
                    user_id=u.id, leave_type="CT", year=YEAR,
                    quota=LEAVE_TYPES["CT"]["default_quota"], used=0,
                )
            )
        db.commit()

        # ---------- Sample leave requests ----------
        def add_leave(user, leave_type, start, end, reason, status, current_approver_id,
                      approvals=None, number=None):
            total = calc_working_days(start, end, db)
            lr = LeaveRequest(
                request_number=number,
                user_id=user.id, leave_type=leave_type, start_date=start, end_date=end,
                total_days=total, reason=reason, status=status,
                current_approver_id=current_approver_id,
            )
            db.add(lr)
            db.flush()
            for a in (approvals or []):
                db.add(LeaveApproval(leave_request_id=lr.id, **a))
            return lr

        today = date.today()

        # 1. Pending di manager Budi.
        add_leave(
            andi, "CT", today + timedelta(days=7), today + timedelta(days=9),
            "Liburan keluarga", "pending", budi.id, number="LEAVE-2026-0001",
        )
        # 2. Approved L1 (manager sudah approve), menunggu Direktur.
        add_leave(
            siti, "CT", today + timedelta(days=14), today + timedelta(days=15),
            "Urusan keluarga", "approved_l1", dirtek.id,
            approvals=[{"approver_id": budi.id, "action": "approved", "level": 1,
                        "notes": "Disetujui, silakan lanjut"}],
            number="LEAVE-2026-0002",
        )
        # 3. Fully approved -> update used balance.
        lr3 = add_leave(
            rudi, "CT", today - timedelta(days=10), today - timedelta(days=8),
            "Acara pernikahan saudara", "approved", None,
            approvals=[
                {"approver_id": budi.id, "action": "approved", "level": 1, "notes": "OK"},
                {"approver_id": dirtek.id, "action": "approved", "level": 2, "notes": "Disetujui"},
            ],
            number="LEAVE-2026-0003",
        )
        db.flush()
        bal = db.query(LeaveBalance).filter(
            LeaveBalance.user_id == rudi.id, LeaveBalance.leave_type == "CT",
            LeaveBalance.year == YEAR,
        ).first()
        bal.used += lr3.total_days
        db.commit()

        # ---------- Sample reimbursement requests ----------
        def add_reimb(user, category, amount, desc, receipt_date, status,
                      current_approver_id, receipt_path, project_code=None,
                      paid_date=None, number=None):
            r = ReimbursementRequest(
                request_number=number, user_id=user.id, category=category,
                amount=amount, description=desc, receipt_date=receipt_date,
                receipt_path=receipt_path, project_code=project_code, status=status,
                current_approver_id=current_approver_id, paid_date=paid_date,
            )
            db.add(r)
            db.flush()
            return r

        # 1. Kecil (< 500rb), pending di manager.
        add_reimb(
            andi, "TR", 85000, "Grab ke lokasi survey proyek Menteng",
            today - timedelta(days=3), "pending", budi.id,
            "sample-receipt.png", project_code="PRJ-2026-011", number="REIMB-2026-0001",
        )
        # 2. Besar (> 500rb), approved -> siap dibayar.
        add_reimb(
            siti, "AC", 1250000, "Hotel 2 malam dinas ke Surabaya",
            today - timedelta(days=12), "approved", None,
            "sample-receipt.png", project_code="PRJ-2026-020", number="REIMB-2026-0002",
        )
        # 3. Sudah paid.
        add_reimb(
            dewi, "ML", 320000, "Makan tim saat lembur tender",
            today - timedelta(days=20), "paid", None,
            "sample-receipt.png", paid_date=today - timedelta(days=5),
            number="REIMB-2026-0003",
        )
        db.commit()

        print("Seeder selesai!")
        print(f"  {len(employees)} users, {len(HOLIDAYS_2026)} hari libur")
        print(f"  Login default password: {DEFAULT_PASSWORD}")
        print("  Akun: rizqi@jfp.co.id (admin), teddy@jfp.co.id (director),")
        print("        budi@jfp.co.id (manager), andi@jfp.co.id (employee)")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
