# smart-home-backend/config.py
import os

class Config:
    # Secret key untuk signing JWT token
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY') # Ambil dari env var, jangan ada default di kode
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600)) # token expired setelah 1 jam