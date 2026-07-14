from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ---------- Auth ----------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


# ---------- User ----------
class UserBase(BaseModel):
    employee_id: str
    full_name: str
    email: EmailStr
    role: str = "employee"
    department: Optional[str] = None
    gender: Optional[str] = None
    join_date: date
    approver_id: Optional[int] = None
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(min_length=6)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    department: Optional[str] = None
    gender: Optional[str] = None
    join_date: Optional[date] = None
    approver_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=6)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: str
    full_name: str
    email: EmailStr
    role: str
    department: Optional[str]
    gender: Optional[str]
    join_date: date
    approver_id: Optional[int]
    is_active: bool


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    employee_id: str
    role: str


# ---------- Leave Balance ----------
class LeaveBalanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    leave_type: str
    year: int
    quota: int
    used: int
    user: Optional[UserBrief] = None


class LeaveBalanceUpdate(BaseModel):
    quota: int


# ---------- Leave Request ----------
class LeaveCreate(BaseModel):
    leave_type: str
    start_date: date
    end_date: date
    reason: Optional[str] = None
    attachment_path: Optional[str] = None


class LeaveApprovalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    approver_id: int
    action: str
    level: int
    notes: Optional[str]
    acted_at: datetime
    approver: Optional[UserBrief] = None


class LeaveOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_number: str
    user_id: int
    leave_type: str
    start_date: date
    end_date: date
    total_days: int
    reason: Optional[str]
    attachment_path: Optional[str]
    status: str
    current_approver_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    user: Optional[UserBrief] = None
    current_approver: Optional[UserBrief] = None
    approvals: list[LeaveApprovalOut] = []


class ActionRequest(BaseModel):
    notes: Optional[str] = None


# ---------- Reimbursement ----------
class ReimbursementCreate(BaseModel):
    category: str
    amount: Decimal
    description: str
    receipt_date: date
    receipt_path: str
    project_code: Optional[str] = None


class ReimbursementApprovalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    approver_id: int
    action: str
    level: int
    notes: Optional[str]
    acted_at: datetime
    approver: Optional[UserBrief] = None


class ReimbursementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_number: str
    user_id: int
    category: str
    amount: Decimal
    description: str
    receipt_date: date
    receipt_path: str
    project_code: Optional[str]
    status: str
    current_approver_id: Optional[int]
    paid_date: Optional[date]
    created_at: datetime
    updated_at: datetime
    user: Optional[UserBrief] = None
    current_approver: Optional[UserBrief] = None
    approvals: list[ReimbursementApprovalOut] = []


# ---------- Holiday ----------
class HolidayCreate(BaseModel):
    holiday_date: date
    description: str


class HolidayOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    holiday_date: date
    description: str
    year: int


# ---------- Upload ----------
class UploadResponse(BaseModel):
    path: str
    filename: str


Token.model_rebuild()
