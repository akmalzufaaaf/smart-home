from datetime import datetime
from database import Database # Gunakan instance Database

# Hapus dictionary 'devices' global
# devices = {
#     "light1": False,
#     "ac1": False,
# }

def get_device_status(device_id: str):
    db = Database()
    device_data = db.devices_collection.find_one({"device_id": device_id})
    if device_data:
        return device_data.get("status", "UNKNOWN") # Default ke UNKNOWN jika status tidak ada
    return None

def get_all_devices_status():
    db = Database()
    all_devices_cursor = db.devices_collection.find({}, {"_id": 0, "device_id": 1, "name": 1, "status": 1, "type": 1 }) # Sesuaikan field yang diambil
    return list(all_devices_cursor)


def register_new_device(device_id: str, name: str, device_type: str, initial_status: str = "OFF"):
    db = Database()
    if db.devices_collection.find_one({"device_id": device_id}):
        return False # Device sudah terdaftar
    db.devices_collection.insert_one({
        "device_id": device_id,
        "name": name,
        "type": device_type, # misal: "relay", "sensor"
        "status": initial_status.upper(),
        "last_updated": datetime.utcnow()
    })
    return True

def toggle_device(device_id, action): # action "on" atau "off"
    db = Database()
    # Fungsi ini sekarang hanya untuk logging dan mungkin validasi device_id
    # Status akan diupdate oleh pesan MQTT atau langsung jika diperlukan
    
    device_exists = db.devices_collection.find_one({"device_id": device_id})
    if not device_exists:
        print(f"Device {device_id} not found in database for toggling.")
        # Kamu bisa memutuskan apakah mau otomatis mendaftarkan device di sini,
        # atau menganggapnya error.
        # Untuk sekarang, kita anggap device harus sudah terdaftar.
        return False

    # Catat log perintah (bukan status aktual, karena status datang dari MQTT)
    log_entry = {
        "device_id": device_id,
        "action_command": action.lower(), # Perintah yang dikirim
        "source": "api_toggle",
        "timestamp": datetime.utcnow()
    }
    db.logs_collection.insert_one(log_entry)
    
    # Update status di database secara optimistik (atau tunggu konfirmasi MQTT)
    # Untuk kesederhanaan, kita update di sini dan MQTT akan mengkonfirmasi/overwrite
    # Ini juga bisa dilakukan di update_device_status_from_mqtt
    new_status = action.upper()
    db.devices_collection.update_one(
        {"device_id": device_id},
        {"$set": {"status": new_status, "last_updated": datetime.utcnow()}}
    )
    print(f"Optimistically set device {device_id} to {new_status} in DB.")

    return True # Mengindikasikan perintah telah diproses oleh backend


def update_device_status_from_mqtt(device_id: str, status: str):
    db = Database()
    current_time = datetime.utcnow()
    
    # Cek apakah perangkat ada, jika tidak, mungkin daftarkan secara otomatis
    # atau abaikan (tergantung kebijakanmu)
    device = db.devices_collection.find_one({"device_id": device_id})
    if not device:
        print(f"Status update for unknown device {device_id}. Registering automatically.")
        # Sederhananya kita daftarkan, nama dan tipe bisa default atau dari payload status jika ada
        register_new_device(device_id, name=f"Device {device_id}", device_type="relay_mqtt", initial_status=status)
    else:
        db.devices_collection.update_one(
            {"device_id": device_id},
            {"$set": {"status": status.upper(), "last_updated_mqtt": current_time}}
        )
    
    print(f"Device {device_id} status updated to {status.upper()} from MQTT in DB.")

    # Catat log perubahan status dari MQTT
    log_entry = {
        "device_id": device_id,
        "status_received": status.upper(),
        "source": "mqtt_status",
        "timestamp": current_time
    }
    db.logs_collection.insert_one(log_entry)

def delete_device(device_id: str):
    db = Database()
    result = db.devices_collection.delete_one({"device_id": device_id})
    if result.deleted_count > 0:
        # Catat log penghapusan perangkat
        log_entry = {
            "device_id": device_id,
            "action": "deleted",
            "source": "api_delete",
            "timestamp": datetime.utcnow()
        }
        db.logs_collection.insert_one(log_entry)
        print(f"Device {device_id} deleted from DB.")
        return True
    print(f"Device {device_id} not found for deletion.")
    return False