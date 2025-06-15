from database import Database
from datetime import datetime

def get_logs():
    db = Database()
    logs = db.logs_collection.find()
    
    # konversi setiap objectid menjadi string
    logs_list = []
    for log in logs:
        log["_id"] = str(log["_id"]) #mongonversi setiap objectid menjadi string
        logs_list.append(log)

    return logs_list # convert cursor to list of logs

# Di services/log_service.py atau rfid_service.py
def get_rfid_logs():
    db = Database()
    logs_cursor = db.rfid_logs_collection.find({}).sort("timestamp", -1) # Urutkan dari terbaru
    logs_list = []
    for log in logs_cursor:
        log["_id"] = str(log["_id"])
        if isinstance(log.get("timestamp"), datetime):
            log["timestamp"] = log["timestamp"].isoformat()
        logs_list.append(log)
    return logs_list