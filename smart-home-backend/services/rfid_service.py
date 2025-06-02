# smart-home-backend/services/rfid_service.py
from datetime import datetime
from database import Database

def add_valid_rfid(rfid_id: str, user_assigned: str = None):
    db = Database()
    if db.valid_rfids_collection.find_one({"rfid_id": rfid_id}):
        print(f"RFID Service: ID {rfid_id} already exists.")
        return False # ID sudah ada

    new_rfid_entry = {
        "rfid_id": rfid_id,
        "user_assigned": user_assigned,
        "added_on": datetime.utcnow()
    }
    db.valid_rfids_collection.insert_one(new_rfid_entry)
    print(f"RFID Service: Added new valid RFID ID {rfid_id} for user {user_assigned}.")
    return True

def remove_valid_rfid(rfid_id: str):
    db = Database()
    result = db.valid_rfids_collection.delete_one({"rfid_id": rfid_id})
    if result.deleted_count > 0:
        print(f"RFID Service: Removed RFID ID {rfid_id}.")
        return True
    print(f"RFID Service: RFID ID {rfid_id} not found for deletion.")
    return False

def get_all_valid_rfids():
    db = Database()
    rfids_cursor = db.valid_rfids_collection.find({}, {"_id": 0}) # Tidak perlu _id MongoDB
    rfid_list = []
    for rfid_doc in rfids_cursor:
        # Jika Anda ingin mengembalikan format yang lebih sederhana (misalnya, hanya list ID)
        # rfid_list.append(rfid_doc["rfid_id"]) 
        # Atau kembalikan seluruh dokumen jika perlu info lain di frontend
        rfid_list.append(rfid_doc)
    return rfid_list

def authenticate_rfid(rfid_id_scanned: str):
    db = Database()
    is_valid = db.valid_rfids_collection.find_one({"rfid_id": rfid_id_scanned}) is not None

    status = "granted" if is_valid else "denied"

    # Pencatatan log tetap penting
    log_entry = {
        "rfid_id_scanned": rfid_id_scanned, # Bedakan dari rfid_id yang valid
        "status": status,
        "source": "rfid_door_scan",
        "timestamp": datetime.utcnow()
    }
    db.logs_collection.insert_one(log_entry) #

    print(f"RFID Service: Authentication attempt for ID {rfid_id_scanned}. Access {status}.")
    return is_valid