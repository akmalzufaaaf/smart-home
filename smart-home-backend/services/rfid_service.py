# smart-home-backend/services/rfid_service.py
from datetime import datetime, timezone
from database import Database

def add_valid_rfid(rfid_id: str, user_assigned: str = None):
    """
    Menambahkan ID RFID baru ke daftar yang valid.
    Mengembalikan True jika berhasil, False jika ID sudah ada.
    """
    if not rfid_id: # Validasi dasar untuk memastikan ID tidak kosong
        return False
        
    db = Database()
    
    # Gunakan find_one untuk memeriksa keberadaan ID dengan lebih efisien
    if db.valid_rfids_collection.find_one({"rfid_id": rfid_id}):
        print(f"RFID Service: ID '{rfid_id}' already exists.")
        return False # ID sudah ada

    new_rfid_entry = {
        "rfid_id": rfid_id,
        "user_assigned": user_assigned if user_assigned else "N/A", # Simpan 'N/A' jika kosong
        "added_on": datetime.now(timezone.utc) # Gunakan timezone-aware datetime
    }
    
    try:
        db.valid_rfids_collection.insert_one(new_rfid_entry)
        print(f"RFID Service: Added new valid RFID ID '{rfid_id}' for user '{user_assigned}'.")
        return True
    except Exception as e:
        print(f"RFID Service: Error inserting new RFID ID '{rfid_id}' to database: {e}")
        return False

def remove_valid_rfid(rfid_id: str):
    """Menghapus ID RFID dari daftar yang valid."""
    db = Database()
    try:
        result = db.valid_rfids_collection.delete_one({"rfid_id": rfid_id})
        if result.deleted_count > 0:
            print(f"RFID Service: Removed RFID ID '{rfid_id}'.")
            return True
        else:
            print(f"RFID Service: RFID ID '{rfid_id}' not found for deletion.")
            return False
    except Exception as e:
        print(f"RFID Service: Error deleting RFID ID '{rfid_id}' from database: {e}")
        return False

def get_all_valid_rfids():
    """Mengambil semua ID RFID yang valid dari database."""
    db = Database()
    try:
        # Mengurutkan berdasarkan tanggal ditambahkan (dari yang terbaru)
        rfids_cursor = db.valid_rfids_collection.find({}, {"_id": 0}).sort("added_on", -1) 
        # Mengembalikan seluruh dokumen karena frontend mungkin perlu 'user_assigned' dan 'added_on'
        return list(rfids_cursor)
    except Exception as e:
        print(f"RFID Service: Error fetching all valid RFIDs from database: {e}")
        return [] # Kembalikan list kosong jika terjadi error

def authenticate_rfid(rfid_id_scanned: str):
    """
    Mengautentikasi ID RFID yang di-scan terhadap daftar yang valid di database
    dan mencatat setiap upaya akses.
    """
    db = Database()
    
    # Lakukan find_one dan simpan hasilnya untuk efisiensi
    valid_rfid_doc = db.valid_rfids_collection.find_one({"rfid_id": rfid_id_scanned})
    is_valid = valid_rfid_doc is not None
    
    status = "granted" if is_valid else "denied"

    # Siapkan log entry
    log_entry = {
        # Mengganti nama field agar lebih konsisten dengan field di dokumen lain
        "rfid_id": rfid_id_scanned, 
        "status": status,
        "source": "rfid_door_scan",
        "timestamp": datetime.now(timezone.utc) # Gunakan timezone-aware datetime
    }
    
    try:
        db.rfid_logs_collection.insert_one(log_entry)
    except Exception as e:
        print(f"RFID Service: Failed to insert RFID log for ID '{rfid_id_scanned}': {e}")

    print(f"RFID Service: Authentication attempt for ID '{rfid_id_scanned}'. Access {status}.")
    return is_valid
