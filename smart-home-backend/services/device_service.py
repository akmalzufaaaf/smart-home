from datetime import datetime
from database import Database

# Dummy implementation of device control (In real-life scenario, this will interface with IoT devices)
devices = {
    "light1": False,
    "ac1": False,
}

def toggle_device(device_id, action):
    if device_id in devices and action in ["on", "off"]:
        devices[device_id] = action == "on"
        
        # pencatatan log di mongodb
        db = Database()
        log_entry = {
            "device_id": device_id,
            "action": action,
            "timestamp": datetime.utcnow()
        }
        db.logs_collection.insert_one(log_entry)
        
        return True
    return False