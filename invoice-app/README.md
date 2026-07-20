# Aplikasi Invoice

Aplikasi web **sederhana** untuk membuat, memratinjau, dan mencetak **invoice jasa**
(seperti invoice konsultan/kontraktor). Dibuat murni dengan **HTML + CSS + JavaScript**
tanpa server dan tanpa dependency — cukup buka `index.html` di browser.

## Fitur

- **Form isian lengkap**: data penerbit, nomor & tanggal invoice, data klien (Ditagihkan Kepada + Attn), referensi proyek/kontrak.
- **Pratinjau langsung (live preview)** dalam format invoice resmi ukuran A4.
- **Rincian tagihan fleksibel**: baris item bisa ditambah/dihapus, nilai Total Kontrak (informasi), dan **PPN otomatis** (default 11%).
- **"Terbilang" otomatis** — jumlah total dikonversi ke kata dalam Bahasa Indonesia (sampai triliunan).
- **Cetak / Simpan PDF** via dialog cetak browser (pilih *Save as PDF*) dengan tata letak khusus cetak.
- **Simpan otomatis** ke `localStorage` — isian tidak hilang saat halaman ditutup.
- **Ekspor / Impor JSON** untuk menyimpan atau memindahkan data invoice.
- **Tombol "Isi Contoh"** yang memuat data contoh invoice jasa.

## Cara Pakai

1. Buka `index.html` di browser (klik dua kali, atau jalankan server statis sederhana).
2. Isi form di sisi kiri — pratinjau di kanan diperbarui otomatis.
3. Klik **Cetak / Simpan PDF**, lalu pilih *Save as PDF* pada dialog cetak.

Menjalankan lewat server lokal (opsional):

```bash
# Python
python3 -m http.server 8080
# lalu buka http://localhost:8080
```

## Struktur File

```
invoice-app/
├── index.html   # struktur halaman (form + pratinjau)
├── styles.css   # gaya tampilan layar & cetak (@media print)
├── app.js       # logika: perhitungan, terbilang, simpan, ekspor/impor, cetak
└── README.md
```

## Perhitungan

- **Subtotal (DPP)** = jumlah seluruh baris tagihan.
- **PPN** = Subtotal × (PPN% / 100).
- **Total** = Subtotal + PPN.
- **Terbilang** dihitung dari Total.

Tidak ada data yang dikirim ke mana pun — semua berjalan di browser Anda.
