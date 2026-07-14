FROM python:3.11-slim

WORKDIR /app

# Dependency OS untuk psycopg2.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Folder upload (bukti/lampiran) — di-mount sebagai volume di produksi.
RUN mkdir -p uploads

EXPOSE 8000

# Jalankan seeder saat pertama kali (opsional) lalu start server.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 8000"]
