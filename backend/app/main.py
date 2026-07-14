import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, engine
from .routers import (
    auth,
    holidays,
    leaves,
    meta,
    reimbursements,
    reports,
    uploads,
    users,
)

# Buat tabel otomatis (untuk dev/SQLite; produksi sebaiknya pakai migrasi).
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="JFP Leave & Reimbursement System",
    description="Sistem manajemen pengajuan cuti dan reimbursement PT Jasa Ferrie Pratama",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(leaves.router)
app.include_router(reimbursements.router)
app.include_router(holidays.router)
app.include_router(reports.router)
app.include_router(uploads.router)
app.include_router(meta.router)

# Serve file upload (bukti/lampiran).
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.get("/")
def root():
    return {"service": "JFP Leave & Reimbursement System", "status": "ok"}


@app.get("/api/health")
def health():
    return {"status": "healthy"}
