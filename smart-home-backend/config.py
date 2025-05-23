import os

class Config:
    # Secret key untuk singning JWT token
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'LKJASPoipojadsfp21') # ganti jwt keynya
    JWT_ACCESS_TOKEN_EXPIRES = 3600 # token expired setelah 1 jam
    