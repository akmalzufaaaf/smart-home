# smart-home-backend/database/__init__.py
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

class Database:
    def __init__(self):
        mongo_uri = os.getenv("MONGO_URI", "mongodb://mongodb:27017")
        self.client = MongoClient(mongo_uri)
        self.db = self.client['smart_home'] # Nama database Anda
        self.users_collection = self.db['users']
        self.logs_collection = self.db['logs']
        self.devices_collection = self.db['devices']
        self.valid_rfids_collection = self.db['valid_rfids'] # Tambahkan ini
        self.rfid_logs_collection = self.db['rfid_logs']