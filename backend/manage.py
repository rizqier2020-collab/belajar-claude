"""Utilitas admin dari command line.

Perintah:
  python manage.py list-users
      Menampilkan semua akun di database (NIK, nama, email, role, aktif/tidak)
      dan sekaligus mengecek apakah password 'password123' cocok.

  python manage.py check <email> <password>
      Cek apakah kombinasi email + password valid.

  python manage.py reset-password <email> <password_baru>
      Ganti password akun tertentu.

Jalankan dari folder backend (virtual environment aktif), contoh:
  python manage.py list-users
  python manage.py reset-password rizqi@jfp.co.id rahasia123
"""

import sys

from app.database import SessionLocal
from app.models import User
from app.auth import hash_password, verify_password


def list_users():
    db = SessionLocal()
    try:
        users = db.query(User).order_by(User.id).all()
        if not users:
            print("(Database kosong — belum ada user. Jalankan: python seed.py)")
            return
        print(f"{'NIK':<10} {'Nama':<24} {'Email':<26} {'Role':<10} {'Aktif':<6} pw123?")
        print("-" * 90)
        for u in users:
            ok = verify_password("password123", u.password_hash)
            print(
                f"{u.employee_id:<10} {u.full_name:<24} {u.email:<26} "
                f"{u.role:<10} {str(bool(u.is_active)):<6} {'YA' if ok else 'TIDAK'}"
            )
    finally:
        db.close()


def check(email, password):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"[GAGAL] Tidak ada akun dengan email persis '{email}'.")
            print("        Cek ejaan email atau spasi tersembunyi.")
            return
        if verify_password(password, user.password_hash):
            print(f"[OK] Email + password BENAR untuk {user.full_name} ({user.role}).")
        else:
            print(f"[GAGAL] Email ditemukan, tapi password salah untuk {user.full_name}.")
    finally:
        db.close()


def reset_password(email, new_password):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"[GAGAL] Tidak ada akun dengan email '{email}'.")
            return
        user.password_hash = hash_password(new_password)
        db.commit()
        print(f"[OK] Password untuk {user.full_name} ({email}) berhasil diganti.")
    finally:
        db.close()


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return
    cmd = args[0]
    if cmd == "list-users":
        list_users()
    elif cmd == "check" and len(args) == 3:
        check(args[1], args[2])
    elif cmd == "reset-password" and len(args) == 3:
        reset_password(args[1], args[2])
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
