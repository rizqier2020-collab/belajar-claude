from datetime import datetime, date

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(20), unique=True, nullable=False, index=True)  # NIK
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="employee")  # employee, manager, director, admin
    department = Column(String(50))
    gender = Column(String(10))  # male, female (untuk validasi cuti melahirkan)
    join_date = Column(Date, nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    approver = relationship("User", remote_side=[id], backref="subordinates")
    leave_balances = relationship("LeaveBalance", back_populates="user")


class LeaveBalance(Base):
    __tablename__ = "leave_balances"
    __table_args__ = (UniqueConstraint("user_id", "leave_type", "year", name="uq_balance"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    leave_type = Column(String(5), nullable=False)  # CT, CS, CM, ...
    year = Column(Integer, nullable=False)
    quota = Column(Integer, nullable=False, default=0)
    used = Column(Integer, nullable=False, default=0)

    user = relationship("User", back_populates="leave_balances")


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_number = Column(String(30), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    leave_type = Column(String(5), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_days = Column(Integer, nullable=False)
    reason = Column(Text)
    attachment_path = Column(String(255))
    status = Column(String(20), default="pending")  # pending, approved_l1, approved, rejected, cancelled
    current_approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    current_approver = relationship("User", foreign_keys=[current_approver_id])
    approvals = relationship(
        "LeaveApproval", back_populates="leave_request", order_by="LeaveApproval.level"
    )


class LeaveApproval(Base):
    __tablename__ = "leave_approvals"

    id = Column(Integer, primary_key=True, index=True)
    leave_request_id = Column(Integer, ForeignKey("leave_requests.id"), nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(20), nullable=False)  # approved, rejected
    level = Column(Integer, nullable=False)  # 1 = manager, 2 = director
    notes = Column(Text)
    acted_at = Column(DateTime, default=datetime.utcnow)

    leave_request = relationship("LeaveRequest", back_populates="approvals")
    approver = relationship("User")


class ReimbursementRequest(Base):
    __tablename__ = "reimbursement_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_number = Column(String(30), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String(5), nullable=False)  # TR, ML, AC, PR, OT
    amount = Column(Numeric(15, 2), nullable=False)
    description = Column(Text, nullable=False)
    receipt_date = Column(Date, nullable=False)
    receipt_path = Column(String(255), nullable=False)
    project_code = Column(String(50))
    status = Column(String(20), default="pending")  # pending, approved_l1, approved, rejected, paid, cancelled
    current_approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    paid_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    current_approver = relationship("User", foreign_keys=[current_approver_id])
    approvals = relationship(
        "ReimbursementApproval",
        back_populates="reimbursement_request",
        order_by="ReimbursementApproval.level",
    )


class ReimbursementApproval(Base):
    __tablename__ = "reimbursement_approvals"

    id = Column(Integer, primary_key=True, index=True)
    reimbursement_request_id = Column(
        Integer, ForeignKey("reimbursement_requests.id"), nullable=False
    )
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(20), nullable=False)
    level = Column(Integer, nullable=False)
    notes = Column(Text)
    acted_at = Column(DateTime, default=datetime.utcnow)

    reimbursement_request = relationship("ReimbursementRequest", back_populates="approvals")
    approver = relationship("User")


class Holiday(Base):
    __tablename__ = "holidays"
    __table_args__ = (UniqueConstraint("holiday_date", name="uq_holiday_date"),)

    id = Column(Integer, primary_key=True, index=True)
    holiday_date = Column(Date, nullable=False, index=True)
    description = Column(String(150), nullable=False)
    year = Column(Integer, nullable=False, index=True)
