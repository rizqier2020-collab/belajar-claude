# JFP — Sistem Manajemen Cuti & Reimbursement

Web application untuk manajemen pengajuan **cuti** dan **reimbursement** karyawan
**PT Jasa Ferrie Pratama (JFP)** — perusahaan konsultan arsitektur & engineering di Jakarta.

Dirancang ringan untuk perusahaan skala kecil (~10–15 karyawan): mudah di-deploy,
approval multi-level, dan mobile-friendly.

---

## ✨ Fitur Utama

- **Autentikasi JWT** dengan role: `employee` → `manager` → `director` → `admin` (FAT Officer).
- **Pengajuan & Approval Cuti** — 7 jenis cuti, tracking kuota, exclude weekend & hari libur nasional, multi-level approval, audit trail.
- **Pengajuan & Approval Reimbursement** — 5 kategori, upload bukti wajib, routing approval berdasarkan nominal (> Rp 500.000 wajib Direktur), status pembayaran.
- **Dashboard** dengan ringkasan pengajuan & indikator notifikasi approval.
- **Admin Panel (FAT)** — manajemen user, kuota cuti, hari libur, laporan, dan override approval.
- **Export laporan** cuti & reimbursement ke CSV (dapat dibuka di Excel).
- **UI Bahasa Indonesia**, responsif, dengan toast notification & status badge berwarna.

---

## 🧱 Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Backend | Python **FastAPI** + **SQLAlchemy** |
| Database | **PostgreSQL** (produksi) / **SQLite** (development) |
| Frontend | **React** + **Vite** + **Tailwind CSS** |
| Auth | **JWT** + **bcrypt** |
| File storage | Local filesystem (`backend/uploads/`) |

---

## 📁 Struktur Proyek

```
.
├── backend/
│   ├── app/
│   │   ├── main.py            # Entry point FastAPI
│   │   ├── config.py          # Konfigurasi (env)
│   │   ├── database.py        # Setup SQLAlchemy
│   │   ├── models.py          # ORM models
│   │   ├── schemas.py         # Pydantic schemas
│   │   ├── auth.py            # JWT + password hashing + RBAC
│   │   ├── services.py        # Logika bisnis (hari kerja, approval chain, dll)
│   │   ├── constants.py       # Enum jenis cuti, kategori, aturan
│   │   └── routers/           # Endpoint per modul
│   ├── seed.py                # Seeder data awal
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/             # Halaman (Login, Dashboard, admin/*, dll)
│   │   ├── components/        # Layout, DataTable, UI, FileUpload
│   │   ├── context/           # Auth & Toast context
│   │   └── api/               # Axios client
│   ├── Dockerfile & nginx.conf
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 🚀 Setup — Development (lokal, tanpa Docker)

### Prasyarat
- Python 3.11+
- Node.js 20+

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Konfigurasi (default sudah SQLite, cukup untuk dev)
cp .env.example .env
# Edit .env: set DATABASE_URL=sqlite:///./jfp.db untuk development

# Jalankan seeder (membuat tabel + data awal)
python seed.py

# Start server
uvicorn app.main:app --reload
```

Backend berjalan di **http://localhost:8000** — dokumentasi API interaktif di
**http://localhost:8000/docs**.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend berjalan di **http://localhost:5173** (request `/api` otomatis di-proxy
ke backend port 8000 — lihat `vite.config.js`).

---

## 🐳 Setup — Docker (produksi)

```bash
# Build & jalankan semua service (PostgreSQL + backend + frontend)
docker compose up -d --build

# Jalankan seeder sekali untuk mengisi data awal
docker compose exec backend python seed.py
```

Akses:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000 (docs di `/docs`)
- **PostgreSQL**: localhost:5432

> ⚠️ **Produksi**: ganti `SECRET_KEY` di `docker-compose.yml` / `.env` dengan string acak.
> Generate: `python -c "import secrets; print(secrets.token_urlsafe(48))"`

---

## 👤 Akun Default (setelah seeder)

Semua akun memakai password: **`password123`**

| Email | Nama | Role |
|-------|------|------|
| `rizqi@jfp.co.id` | Rizqi | Admin (FAT Officer) |
| `noordian@jfp.co.id` | Ir. Noordian Moeloek | Director (Direktur Utama) |
| `teddy@jfp.co.id` | Teddy Rahmatullah | Director (Direktur Teknis) |
| `budi@jfp.co.id` | Budi Santoso | Manager (Kepala Divisi Arsitektur) |
| `andi@jfp.co.id` | Andi Wijaya | Employee → Budi → Teddy |
| `siti@jfp.co.id` | Siti Nurhaliza | Employee → Budi → Teddy |
| `rudi@jfp.co.id` | Rudi Hartono | Employee → Budi → Teddy |
| `dewi@jfp.co.id` | Dewi Lestari | Employee → Teddy (langsung ke Direktur) |

Seeder juga mengisi: 14 hari libur nasional 2026, kuota cuti tahunan 12 hari,
serta beberapa sample pengajuan cuti & reimbursement di berbagai status.

---

## 📋 Aturan Bisnis

### Cuti
| Kode | Jenis | Kuota/Tahun |
|------|-------|-------------|
| CT | Cuti Tahunan | 12 hari |
| CS | Cuti Sakit | – (wajib surat dokter jika > 1 hari) |
| CM | Cuti Menikah | 3 hari |
| CK | Cuti Melahirkan | 90 hari (khusus perempuan) |
| CB | Cuti Besar | sesuai kebijakan |
| CP | Cuti Penting | sesuai UU |
| CI | Izin Tidak Masuk | – |

- `total_days` dihitung otomatis, **exclude** Sabtu-Minggu & hari libur nasional.
- Validasi kuota sebelum submit; kuota terpakai diupdate setelah **final approved**.
- Karyawan dapat membatalkan pengajuan selama status masih `pending`.

### Reimbursement
| Kode | Kategori |
|------|----------|
| TR | Transport |
| ML | Meals |
| AC | Accommodation |
| PR | Printing |
| OT | Others |

- Upload bukti **wajib** (JPG/PNG/PDF, maks 5 MB).
- `receipt_date` maksimal 30 hari ke belakang.
- Nominal **> Rp 500.000** wajib approval hingga **Director**; di bawahnya cukup **Manager**.
- Setelah approved, admin (FAT) menandai `paid` + tanggal bayar.

### Alur Approval
```
Employee submit → Manager (Level 1) → Director (Level 2, final)
```
Jika karyawan langsung di bawah Director (tanpa Manager), langsung ke Director.
Admin (FAT) dapat melakukan **override** approval kapan saja.

---

## 🔌 Ringkasan API

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| POST | `/api/auth/login` | Login (form: `username`=email, `password`) |
| GET | `/api/auth/me` | Profil user aktif |
| GET/POST/PUT | `/api/users` | Manajemen user (admin) |
| GET/POST | `/api/leaves` | List & buat pengajuan cuti |
| POST | `/api/leaves/{id}/approve\|reject` | Aksi approval |
| PUT | `/api/leaves/{id}/cancel` | Batalkan pengajuan |
| GET/PUT | `/api/leaves/balances` | Kuota cuti (admin dapat edit) |
| GET/POST | `/api/reimbursements` | List & buat reimbursement |
| PUT | `/api/reimbursements/{id}/paid` | Tandai dibayar (admin) |
| GET/POST/DELETE | `/api/holidays` | Manajemen hari libur (admin) |
| GET | `/api/reports/leaves?year=&month=` | Export CSV cuti (admin) |
| GET | `/api/reports/reimbursements?year=&month=` | Export CSV reimbursement (admin) |
| POST | `/api/uploads` | Upload lampiran/bukti |

Dokumentasi lengkap & interaktif tersedia di `/docs` (Swagger UI).

---

## 🔒 Catatan Keamanan Produksi

- Ganti `SECRET_KEY` dengan nilai acak yang kuat.
- Gunakan PostgreSQL (bukan SQLite) untuk produksi.
- Aktifkan HTTPS (mis. reverse proxy Nginx/Caddy di depan).
- Backup folder `uploads/` & database secara berkala.
