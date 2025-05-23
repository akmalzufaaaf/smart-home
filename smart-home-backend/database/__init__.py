from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()  # Memuat variabel lingkungan dari file .env

class Database:
    def __init__(self):
        mongo_uri = os.getenv("MONGO_URI", "mongodb://mongodb:27017")  # Menggunakan variabel lingkungan
        self.client = MongoClient(mongo_uri)
        self.db = self.client['smart_home']
        self.users_collection = self.db['users']
        self.logs_collection = self.db['logs']
        self.devices_collection = self.db['devices']
