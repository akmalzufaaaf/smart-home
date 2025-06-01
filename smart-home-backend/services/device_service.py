# smart-home-backend/services/device_service.py
from datetime import datetime
from database import Database

def get_device_status(device_id: str):
    db = Database()
    device_data = db.devices_collection.find_one({"device_id": device_id})
    if device_data:
        return device_data.get("status", "UNKNOWN") 
    return None # Atau "UNKNOWN" jika device tidak ditemukan

def get_all_devices_status():
    db = Database()
    all_devices_cursor = db.devices_collection.find({}, {"_id": 0, "device_id": 1, "name": 1, "status": 1, "type": 1 })
    return list(all_devices_cursor)

def register_new_device(device_id: str, name: str, device_type: str, initial_status: str = "OFF"):
    db = Database()
    if db.devices_collection.find_one({"device_id": device_id}):
        return False 
    db.devices_collection.insert_one({
        "device_id": device_id,
        "name": name,
        "type": device_type,
        "status": initial_status.upper(),
        "last_updated": datetime.utcnow()
    })
    return True

def toggle_device(device_id, action): # action "on" atau "off" (dari route sudah lowercase)
    db = Database()
    device_exists = db.devices_collection.find_one({"device_id": device_id})
    if not device_exists:
        print(f"Service: Device {device_id} not found in database for toggling.")
        return False

    log_entry = {
        "device_id": device_id,
        "action_command": action.lower(), 
        "source": "api_toggle",
        "timestamp": datetime.utcnow()
    }
    db.logs_collection.insert_one(log_entry)
    
    new_status = action.upper()
    db.devices_collection.update_one(
        {"device_id": device_id},
        {"$set": {"status": new_status, "last_updated": datetime.utcnow()}}
    )
    print(f"Service: Optimistically set device {device_id} to {new_status} in DB.")
    return True

def update_device_status_from_mqtt(device_id: str, status: str) -> bool: # Tambahkan type hint -> bool
    db = Database()
    current_time = datetime.utcnow()
    status_did_change = False # Flag untuk melacak perubahan

    status_upper = status.strip().upper()

    device = db.devices_collection.find_one({"device_id": device_id})
    if not device:
        print(f"Service: Status update for unknown device {device_id} from MQTT. Registering automatically.")
        register_new_device(device_id, name=f"Device {device_id} (MQTT)", device_type="relay_mqtt", initial_status=status_upper)
        status_did_change = True # Dianggap berubah karena perangkat baru dibuat
    else:
        if device.get("status") != status_upper:
            db.devices_collection.update_one(
                {"device_id": device_id},
                {"$set": {"status": status_upper, "last_updated_mqtt": current_time}}
            )
            print(f"Service: Device {device_id} status updated to {status_upper} from MQTT in DB.")
            status_did_change = True
        else:
            print(f"Service: Device {device_id} status from MQTT ('{status_upper}') is same as in DB. No DB update.")
            # status_did_change tetap False
    
    # Catat log selalu, bahkan jika status tidak berubah di DB, karena pesan diterima
    log_entry = {
        "device_id": device_id,
        "status_received": status_upper,
        "source": "mqtt_status_report",
        "timestamp": current_time
    }
    db.logs_collection.insert_one(log_entry)
    
    return status_did_change # Kembalikan apakah status di DB berubah

def delete_device(device_id: str):
    db = Database()
    result = db.devices_collection.delete_one({"device_id": device_id})
    if result.deleted_count > 0:
        log_entry = {
            "device_id": device_id,
            "action": "deleted",
            "source": "api_delete",
            "timestamp": datetime.utcnow()
        }
        db.logs_collection.insert_one(log_entry)
        print(f"Service: Device {device_id} deleted from DB.")
        return True
    print(f"Service: Device {device_id} not found for deletion.")
    return False