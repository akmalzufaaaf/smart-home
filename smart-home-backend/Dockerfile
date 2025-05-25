# Gunakan base image Python yang sesuai
FROM python:3.9-slim

# Set working directory di dalam container
WORKDIR /app

# Salin file requirements dan install dependencies
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Salin semua file aplikasi ke working directory
COPY . .

# Expose port yang digunakan Flask (default 5000)
EXPOSE 5000

# Perintah untuk menjalankan aplikasi menggunakan Gunicorn (server WSGI produksi)
# Sesuaikan jumlah worker jika perlu
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]