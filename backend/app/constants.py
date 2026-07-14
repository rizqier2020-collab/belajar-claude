"""Konstanta domain: jenis cuti, kategori reimbursement, dan aturan bisnis."""

# Jenis cuti: kode -> (nama, kuota default per tahun atau None jika tanpa kuota,
#                       butuh_lampiran_wajib, keterangan)
LEAVE_TYPES = {
    "CT": {"name": "Cuti Tahunan", "default_quota": 12, "keterangan": "Sesuai UU Ketenagakerjaan"},
    "CS": {"name": "Cuti Sakit", "default_quota": None, "keterangan": "Wajib lampiran surat dokter jika > 1 hari"},
    "CM": {"name": "Cuti Menikah", "default_quota": 3, "keterangan": "Sesuai UU Ketenagakerjaan"},
    "CK": {"name": "Cuti Melahirkan", "default_quota": 90, "keterangan": "Khusus karyawan perempuan"},
    "CB": {"name": "Cuti Besar", "default_quota": None, "keterangan": "Masa kerja > 6 tahun"},
    "CP": {"name": "Cuti Penting", "default_quota": None, "keterangan": "Keluarga meninggal, anak sunat/baptis, dll"},
    "CI": {"name": "Izin Tidak Masuk", "default_quota": None, "keterangan": "Tanpa potong cuti tahunan"},
}

# Jenis cuti yang memotong kuota (punya default_quota) — used akan di-track.
QUOTA_LEAVE_TYPES = {k for k, v in LEAVE_TYPES.items() if v["default_quota"] is not None}

REIMBURSEMENT_CATEGORIES = {
    "TR": "Transport",
    "ML": "Meals",
    "AC": "Accommodation",
    "PR": "Printing",
    "OT": "Others",
}

ROLES = ["employee", "manager", "director", "admin"]

# Ambang nominal reimbursement yang butuh approval Director (level 2).
DIRECTOR_APPROVAL_THRESHOLD = 500_000

# Batas klaim reimbursement (hari ke belakang dari receipt_date).
MAX_RECEIPT_AGE_DAYS = 30
