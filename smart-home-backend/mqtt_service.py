# mqtt_service.py
import paho.mqtt.client as mqtt
import os
import json

BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "broker.hivemq.com")
BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", 1883))
TOPIC_DEVICE_CONTROL_BASE = os.getenv("MQTT_TOPIC_DEVICE_CONTROL_BASE", "home/device")
TOPIC_STATUS_BASE = os.getenv("MQTT_TOPIC_STATUS_BASE", "home/device")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
db_updater_func = None # Ganti nama agar lebih jelas ini adalah fungsi

def set_db_updater(updater_func_param):
    global db_updater_func
    db_updater_func = updater_func_param

def on_connect(client, userdata, flags, rc):
    print(f"MQTT: Connected to broker with result code {rc}")
    status_topic_to_subscribe = f"{TOPIC_STATUS_BASE}/+/status"
    client.subscribe(status_topic_to_subscribe)
    print(f"MQTT: Subscribed to '{status_topic_to_subscribe}'")

def publish_status(device_id: str, status: str):
    if not device_id or not isinstance(status, str):
        print(f"[MQTT STATUS PUBLISH ERROR] Invalid device_id ('{device_id}') or status ('{status}') for publishing.")
        return
    status_topic = f"{TOPIC_STATUS_BASE}/{device_id}/status"
    payload = status.strip().upper()
    client.publish(status_topic, payload, qos=1, retain=True)
    print(f"[MQTT STATUS] Published '{payload}' to '{status_topic}' (QoS 1, Retain True)")

def on_message(client, userdata, msg):
    message_payload = ""
    try:
        message_payload = msg.payload.decode().strip()
        topic = msg.topic
        print(f"MQTT: Raw message received - Topic: '{topic}', Payload: '{message_payload}'")

        # Pastikan ini bukan pesan yang baru saja kita publish (untuk menghindari loop sederhana)
        # Ini adalah heuristik, mungkin perlu cara yang lebih canggih jika ada banyak instance backend
        # atau jika Anda ingin membedakan sumber pesan dengan lebih baik.
        # Untuk sekarang, kita asumsikan jika kita panggil db_updater dan status tidak berubah, kita tidak publish ulang.

        if topic.startswith(TOPIC_STATUS_BASE) and topic.endswith("/status"):
            # Logika ekstraksi device_id (seperti sebelumnya, pastikan ini benar untuk struktur topik Anda)
            device_id = None
            expected_prefix = f"{TOPIC_STATUS_BASE}/"
            if topic.startswith(expected_prefix) and topic.endswith("/status"):
                device_id_part = topic[len(expected_prefix):-len("/status")]
                if '/' not in device_id_part and device_id_part:
                    device_id = device_id_part
            # Tambahkan penanganan jika TOPIC_STATUS_BASE kosong atau struktur berbeda (seperti kode Anda sebelumnya)

            if not device_id:
                print(f"MQTT: Could not parse device_id from topic '{topic}' with base '{TOPIC_STATUS_BASE}'.")
                return

            status_value = message_payload.upper()
            print(f"MQTT: Parsed for DB update -> Device ID: '{device_id}', Status: '{status_value}'")

            if db_updater_func:
                # db_updater_func (yaitu update_device_status_from_mqtt) akan mengembalikan True jika status di DB benar-benar berubah
                status_actually_changed_in_db = db_updater_func(device_id, status_value)
                
                # HANYA publish ulang jika status di DB BENAR-BENAR BERUBAH oleh pesan ini.
                # Ini akan menghentikan loop echo.
                if status_actually_changed_in_db:
                    print(f"MQTT: DB status for '{device_id}' was changed by incoming message. Re-broadcasting with retain.")
                    publish_status(device_id, status_value) 
                else:
                    print(f"MQTT: DB status for '{device_id}' was NOT changed by incoming message (already up-to-date or device unknown). No re-broadcast from on_message.")
            else:
                print("MQTT: db_updater_func not set.")

    except Exception as e:
        print(f"MQTT: Error processing message from topic '{msg.topic}', payload '{message_payload}': {e}")

def init_mqtt(app_db_updater=None): # Nama argumen diubah agar tidak bentrok dengan variabel global
    if app_db_updater:
        set_db_updater(app_db_updater) # Panggil fungsi setter
    client.on_connect = on_connect
    client.on_message = on_message
    try:
        print(f"MQTT: Attempting to connect to broker {BROKER_HOST}:{BROKER_PORT}")
        client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
        client.loop_start()
    except Exception as e:
        print(f"MQTT: Connection to broker failed: {e}")

def publish_control(device_id: str, action: str):
    # ... (fungsi publish_control tetap sama) ...
    if not device_id or not isinstance(action, str):
        print(f"[MQTT CONTROL PUBLISH ERROR] Invalid device_id ('{device_id}') or action ('{action}')")
        return
    control_topic = f"{TOPIC_DEVICE_CONTROL_BASE}/{device_id}/control"
    payload = json.dumps({"action": action.strip().upper()})
    client.publish(control_topic, payload, qos=1)
    print(f"[MQTT CONTROL] Published '{payload}' to '{control_topic}' (QoS 1)")