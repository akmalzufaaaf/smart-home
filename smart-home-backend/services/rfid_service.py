from datetime import datetime
from database import Database

# List of valid RFID IDs (for testing purposes)
valid_rfid_ids = ["12345"] # tambahkan rfid id (string)

def authenticate_rfid(rfid_id):
    status = "granted" if rfid_id in valid_rfid_ids else "denied"

    # pencatatan log
    db = Database()
    log_entry = {
        "rfid_id": rfid_id,
        "status": status,
        "timestamp": datetime.utcnow()
    }
    db.logs_collection.insert_one(log_entry)
    
    # Simulate authenticating an RFID ID
    return rfid_id in valid_rfid_ids