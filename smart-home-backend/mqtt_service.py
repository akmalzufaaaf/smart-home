# smart-home-backend/mqtt_service.py
import paho.mqtt.client as mqtt
import os
import json

# --- KONFIGURASI ---
# Mengambil konfigurasi dari environment variables dengan nilai default yang jelas
BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "broker.hivemq.com")
BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", 1883))
# Base topic untuk KONTROL perangkat, misal: home/device
TOPIC_DEVICE_CONTROL_BASE = os.getenv("MQTT_TOPIC_DEVICE_CONTROL_BASE", "home/device")
# Base topic untuk STATUS perangkat, misal: home/device
TOPIC_STATUS_BASE = os.getenv("MQTT_TOPIC_STATUS_BASE", "home/device")
# Topik spesifik untuk menerima hasil scan RFID dari ESP8266
TOPIC_RFID_SCAN_RECEIVE = "home/doorlock/rfid_scan"

# --- Inisialisasi Klien MQTT ---
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1) # Gunakan V1 untuk kompatibilitas
db_updater_func = None # Variabel untuk menyimpan fungsi callback dari service

def set_db_updater(updater_func_param):
    """Menetapkan fungsi callback yang akan dipanggil untuk memperbarui database."""
    global db_updater_func
    db_updater_func = updater_func_param

def on_connect(client, userdata, flags, rc):
    """Callback yang dijalankan saat koneksi ke broker berhasil."""
    if rc == 0:
        print(f"MQTT: Connected successfully to broker at {BROKER_HOST}:{BROKER_PORT}")
        # Subscribe ke topik status umum dari semua perangkat
        # Format: TOPIC_STATUS_BASE/+/status (misal: home/device/+/status)
        status_topic_to_subscribe = f"{TOPIC_STATUS_BASE}/+/status"
        client.subscribe(status_topic_to_subscribe)
        print(f"MQTT: Subscribed to device status topic: '{status_topic_to_subscribe}'")
        
        # Subscribe ke topik scan RFID dari ESP8266
        client.subscribe(TOPIC_RFID_SCAN_RECEIVE)
        print(f"MQTT: Subscribed to RFID scan topic: '{TOPIC_RFID_SCAN_RECEIVE}'")
    else:
        print(f"MQTT: Failed to connect, return code {rc}\n")

def publish_status(device_id: str, status: str):
    """
    Mem-publish status perangkat ke topik statusnya dengan flag retained.
    Ini adalah fungsi utama untuk memberitahu frontend dan klien lain tentang status terbaru.
    """
    if not device_id or not isinstance(status, str):
        print(f"[MQTT STATUS PUBLISH ERROR] Invalid device_id ('{device_id}') or status ('{status}') for publishing.")
        return
    
    status_topic = f"{TOPIC_STATUS_BASE}/{device_id}/status"
    payload = status.strip().upper()
    client.publish(status_topic, payload, qos=1, retain=True)
    print(f"[MQTT STATUS] Published '{payload}' to '{status_topic}' (QoS 1, Retain True)")

def on_message(client, userdata, msg):
    """Callback yang dijalankan setiap kali ada pesan masuk dari topik yang di-subscribe."""
    topic = msg.topic
    payload_str = ""
    try:
        payload_str = msg.payload.decode().strip()
        print(f"MQTT: Raw message received - Topic: '{topic}', Payload: '{payload_str}'")

        # --- LOGIKA UNTUK MENANGANI PESAN DARI TOPIK BERBEDA ---

        # 1. Jika pesan berasal dari topik scan RFID
        if topic == TOPIC_RFID_SCAN_RECEIVE:
            print(f"MQTT: Processing RFID scan message...")
            try:
                data = json.loads(payload_str)
                rfid_id = data.get("rfid_id_scanned") # Key ini harus cocok dengan yang dikirim ESP8266
                if rfid_id:
                    # Di sini kita tidak perlu memanggil authenticate_rfid lagi karena ESP8266
                    # sudah melakukannya via API dan hanya mengirimkan log.
                    # Backend HANYA MENCATAT bahwa ada upaya scan.
                    # Logika autentikasi dan pencatatan log utama ada di endpoint API.
                    print(f"MQTT: Log for RFID ID '{rfid_id}' received from ESP8266.")
                    # Jika Anda tetap ingin ada aksi di sini, Anda bisa menambahkannya.
                else:
                    print("MQTT: RFID scan message received, but 'rfid_id_scanned' key not found in JSON payload.")
            except json.JSONDecodeError:
                print(f"MQTT: Could not decode JSON from RFID scan message: '{payload_str}'")
            # Hentikan proses di sini untuk pesan RFID
            return

        # 2. Jika pesan berasal dari topik status perangkat
        elif topic.startswith(TOPIC_STATUS_BASE) and topic.endswith("/status"):
            print(f"MQTT: Processing device status message...")
            # Ekstraksi device_id dari topik
            expected_prefix = f"{TOPIC_STATUS_BASE}/"
            device_id_part = topic[len(expected_prefix):-len("/status")]
            if '/' not in device_id_part and device_id_part:
                device_id = device_id_part
                status_value = payload_str.upper()
                print(f"MQTT: Parsed for DB update -> Device ID: '{device_id}', Status: '{status_value}'")

                if db_updater_func:
                    # Panggil fungsi dari device_service untuk update DB
                    # Fungsi ini akan mengembalikan True jika ada perubahan di DB
                    status_changed_in_db = db_updater_func(device_id, status_value)
                    
                    # Hanya publish ulang jika status di DB benar-benar berubah oleh pesan ini.
                    # Ini untuk mencegah loop di mana backend menerima kembali pesannya sendiri.
                    if status_changed_in_db:
                        print(f"MQTT: DB status for '{device_id}' was changed by incoming message. Re-broadcasting with retain flag.")
                        publish_status(device_id, status_value)
                    else:
                        print(f"MQTT: DB status for '{device_id}' was already up-to-date. No re-broadcast needed.")
                else:
                    print("MQTT: db_updater_func is not set. Cannot update database.")
            else:
                print(f"MQTT: Error parsing device_id from status topic '{topic}'")
                
    except Exception as e:
        print(f"MQTT: Error processing message from topic '{topic}', payload '{payload_str}': {e}")

def init_mqtt(app_db_updater=None):
    """Menginisialisasi dan memulai koneksi klien MQTT."""
    if app_db_updater:
        set_db_updater(app_db_updater)
    
    client.on_connect = on_connect
    client.on_message = on_message
    
    try:
        print(f"MQTT: Attempting to connect to broker at {BROKER_HOST}:{BROKER_PORT}")
        client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
        client.loop_start() # Menjalankan client di thread terpisah, non-blocking
    except Exception as e:
        print(f"MQTT: Connection to broker failed: {e}")

def publish_control(device_id: str, action: str):
    """Mem-publish perintah kontrol ke perangkat keras."""
    if not device_id or not isinstance(action, str):
        print(f"[MQTT CONTROL PUBLISH ERROR] Invalid device_id ('{device_id}') or action ('{action}')")
        return

    # Buat topik kontrol yang dinamis berdasarkan device_id
    control_topic = f"{TOPIC_DEVICE_CONTROL_BASE}/{device_id}/control"
    # Buat payload JSON sesuai yang diharapkan ESP8266
    payload = json.dumps({"action": action.strip().upper()})
    
    client.publish(control_topic, payload, qos=1)
    print(f"[MQTT CONTROL] Published '{payload}' to '{control_topic}' (QoS 1)")