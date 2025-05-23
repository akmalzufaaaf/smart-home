# Gunakan image Python 3.8 sebagai base image
FROM python:3.9-slim

# Set working directory di dalam container
WORKDIR /app

# Salin requirements.txt ke dalam container
COPY requirements.txt /app/

# Install dependensi yang ada di requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Salin semua kode aplikasi ke dalam container
COPY . /app/

# Set environment variable untuk Flask
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0

# Expose port Flask
EXPOSE 5000

# Jalankan aplikasi Flask
CMD ["flask", "run"]
