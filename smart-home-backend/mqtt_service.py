# mqtt_service.py
import paho.mqtt.client as mqtt
import os
import json

BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "broker.hivemq.com")
BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", 1883))
TOPIC_DEVICE_CONTROL_BASE = os.getenv("MQTT_TOPIC_DEVICE_CONTROL_BASE", "home/device")
TOPIC_STATUS_BASE = os.getenv("MQTT_TOPIC_STATUS_BASE", "home/device")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
db_updater = None

def set_db_updater(updater):
    global db_updater
    db_updater = updater

def on_connect(client, userdata, flags, rc):
    print(f"MQTT connected with code {rc}")
    status_topic_to_subscribe = f"{TOPIC_STATUS_BASE}/+/status" # Backend subscribe ke semua status device
    client.subscribe(status_topic_to_subscribe)
    print(f"MQTT: Subscribed to {status_topic_to_subscribe}")

# --- FUNGSI BARU UNTUK PUBLISH STATUS ---
def publish_status(device_id: str, status: str):
    """
    Publishes the device status to the status topic.
    Status: e.g., 'ON' or 'OFF' (akan dikonversi ke uppercase)
    """
    if not device_id or not isinstance(status, str):
        print(f"[MQTT STATUS PUBLISH ERROR] Invalid device_id or status for publishing: ID='{device_id}', Status='{status}'")
        return

    status_topic = f"{TOPIC_STATUS_BASE}/{device_id}/status"
    # Menggunakan QoS=1 dan Retain=True untuk pesan status
    # Retain=True penting agar klien baru yang subscribe langsung dapat status terakhir.
    client.publish(status_topic, status.upper(), qos=1, retain=True)
    print(f"[MQTT STATUS] Published status '{status.upper()}' to '{status_topic}' (QoS 1, Retain True)")

def on_message(client, userdata, msg):
    message_payload = msg.payload.decode()
    topic_parts = msg.topic.split('/')
    print(f"MQTT: Received message '{message_payload}' from topic '{msg.topic}'")

    # Hanya proses pesan dari topik status perangkat keras
    # (Backend seharusnya tidak memproses pesan dari topik kontrol yang dikirimnya sendiri)
    if msg.topic.startswith(TOPIC_STATUS_BASE) and msg.topic.endswith("/status") and \
       not msg.topic.endswith("/control"): # Pastikan bukan topik kontrol
        try:
            # Ekstraksi device_id dari topik: home/device/DEVICE_ID/status
            # topic_parts akan [home, device, DEVICE_ID, status] jika TOPIC_STATUS_BASE adalah "home/device"
            expected_parts_after_base = 2 # DEVICE_ID dan "status"
            base_topic_parts_count = TOPIC_STATUS_BASE.count('/') + 1
            
            if len(topic_parts) == base_topic_parts_count + expected_parts_after_base -1 : # -1 karena split menghasilkan satu lebih banyak dari jumlah '/'
                 device_id = topic_parts[base_topic_parts_count-1] # Koreksi index jika base topic tidak mengandung '/'
            elif len(topic_parts) == base_topic_parts_count + expected_parts_after_base :
                 device_id = topic_parts[base_topic_parts_count]
            else: # jika base topic sederhana seperti "home"
                 if len(topic_parts) == 2 + expected_parts_after_base : # home/DEVICE_ID/status
                      device_id = topic_parts[1] # Sesuaikan berdasarkan TOPIC_STATUS_BASE
                 else:
                    print(f"MQTT: Error parsing device_id from topic '{msg.topic}' with base '{TOPIC_STATUS_BASE}'. Parts: {topic_parts}")
                    return


            status_value = message_payload.strip().upper() # Bersihkan spasi dan uppercase

            print(f"MQTT: Parsed for DB update -> Device ID: '{device_id}', Status: '{status_value}'")

            if db_updater:
                # Update status di database berdasarkan laporan dari perangkat keras
                db_updater(device_id, status_value) 
            
            # Setelah DB diupdate dari laporan perangkat keras,
            # publish ulang status ini untuk memastikan semua klien (termasuk frontend)
            # mendapatkan status yang konsisten dan "retained" dari backend.
            # Ini juga berguna jika payload asli dari perangkat keras perlu "dibersihkan" atau divalidasi.
            publish_status(device_id, status_value)

        except IndexError:
            print(f"MQTT: Error parsing device_id from topic (IndexError): {msg.topic}")
        except Exception as e:
            print(f"MQTT: Error processing message from {msg.topic}: {e}")

def init_mqtt(app_db_updater=None):
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

def publish_control(device_id: str, action: str): #
    control_topic = f"{TOPIC_DEVICE_CONTROL_BASE}/{device_id}/control"
    payload = json.dumps({"action": action.upper()})
    client.publish(control_topic, payload, qos=1) # Tambahkan QoS 1
    print(f"[MQTT CONTROL] Published '{payload}' to '{control_topic}' (QoS 1)")