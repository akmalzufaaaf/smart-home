import paho.mqtt.client as mqtt
import os
import json # Import json

# konfigurasi broker (bisa diatur lewat env var)
BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "broker.hivemq.com")
BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", 1883))
# Menggunakan base topic dari environment variable
TOPIC_DEVICE_CONTROL_BASE = os.getenv("MQTT_TOPIC_DEVICE_CONTROL_BASE", "b51328ec-42ca-4163-a699-c15ad7a4cae0/home/device")
TOPIC_STATUS_BASE = os.getenv("MQTT_TOPIC_STATUS_BASE", "b51328ec-42ca-4163-a699-c15ad7a4cae0/home/device")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1) # Spesifikasikan versi callback API

# Simpan referensi ke app atau service lain jika diperlukan untuk update DB
# Contoh sederhana:
db_updater = None

def set_db_updater(updater):
    global db_updater
    db_updater = updater

def on_connect(client, userdata, flags, rc):
    print(f"MQTT connected with code {rc}")
    # Subscribe ke topik status untuk semua perangkat (menggunakan wildcard)
    # Misalnya: b51328ec-42ca-4163-a699-c15ad7a4cae0/home/device/+/status
    # Perangkat akan publish ke TOPIC_STATUS_BASE/<device_id>/status
    status_topic_to_subscribe = f"{TOPIC_STATUS_BASE}/+/status"
    client.subscribe(status_topic_to_subscribe)
    print(f"Subscribed to {status_topic_to_subscribe}")

def on_message(client, userdata, msg):
    message_payload = msg.payload.decode()
    topic_parts = msg.topic.split('/')
    print(f"Received message '{message_payload}' from topic '{msg.topic}'")

    # Contoh: b51328ec-42ca-4163-a699-c15ad7a4cae0/home/device/light1/status
    # topic_parts akan menjadi ['b51328ec-42ca-4163-a699-c15ad7a4cae0', 'home', 'device', 'light1', 'status']
    # Kita asumsikan formatnya adalah BASE_TOPIC/DEVICE_ID/status
    
    # Pastikan topik sesuai dengan pola yang diharapkan
    # dan mengandung device_id
    if msg.topic.startswith(TOPIC_STATUS_BASE) and msg.topic.endswith("/status"):
        try:
            # Ambil device_id dari topik. Ini tergantung struktur topik yang kamu pilih.
            # Jika TOPIC_STATUS_BASE adalah "X/Y/Z", dan topiknya "X/Y/Z/device_id/status",
            # maka device_id ada di indeks ke-3 setelah split TOPIC_STATUS_BASE
            # atau lebih mudah, ambil elemen sebelum 'status'
            device_id = topic_parts[-2] # Ambil bagian sebelum "status"
            
            status_value = message_payload.upper() # Misal ON atau OFF

            print(f"Device ID: {device_id}, Status: {status_value}")

            # TODO: Panggil fungsi untuk update status perangkat di database
            # Contoh:
            # from services.device_service import update_device_status_from_mqtt
            # update_device_status_from_mqtt(device_id, status_value)
            if db_updater:
                db_updater(device_id, status_value) # Panggil fungsi update status

            # Kamu bisa mengirimkan notifikasi ke frontend jika diperlukan (misalnya via WebSocket)
        except IndexError:
            print(f"Error parsing device_id from topic: {msg.topic}")
        except Exception as e:
            print(f"Error processing message from {msg.topic}: {e}")


# inisialisasi dan koneksi
def init_mqtt(app_db_updater=None): # Terima fungsi updater
    global db_updater
    if app_db_updater:
        db_updater = app_db_updater

    client.on_connect = on_connect
    client.on_message = on_message
    try:
        client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
        client.loop_start()
    except Exception as e:
        print(f"MQTT connection failed: {e}")

# fungsi untuk publish perintah kontrol ke perangkat
def publish_control(device_id: str, action: str):
    """Action: misal 'ON atau 'OFF'"""
    # Perangkat akan subscribe ke TOPIC_DEVICE_CONTROL_BASE/<device_id>/control
    control_topic = f"{TOPIC_DEVICE_CONTROL_BASE}/{device_id}/control"
    
    # Payload bisa berupa action langsung (ON/OFF) atau JSON
    # payload = action.upper() # Jika payload hanya ON/OFF
    payload = json.dumps({"action": action.upper()}) # Jika payload berupa JSON

    client.publish(control_topic, payload)
    print(f"[MQTT] Published '{payload}' to {control_topic}")