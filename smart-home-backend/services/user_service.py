# smart-home-backend/services/user_service.py
from database import Database

def get_all_users():
    db = Database()
    # Ambil semua pengguna, hilangkan field password untuk keamanan
    users_cursor = db.users_collection.find({}, {"password": 0}) 
    users_list = []
    for user in users_cursor:
        user["_id"] = str(user["_id"]) # Konversi ObjectId ke string
        users_list.append(user)
    return users_list

def get_user_by_username(username):
    db = Database()
    user_data = db.users_collection.find_one({"username": username}, {"password": 0})
    if user_data:
        user_data["_id"] = str(user_data["_id"])
    return user_data