import paho.mqtt.client as mqtt
import os

# konfigurasi broker (bisa diatur lewat env var)
BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "broker.hivemq.com")
BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", 1883))
TOPIC_DEVICE = os.getenv("MQTT_TOPIC_DEVICE", "b51328ec-42ca-4163-a699-c15ad7a4cae0/home/device/control")
TOPIC_STATUS = os.getenv("MQTT_TOPIC_STATUS", "b51328ec-42ca-4163-a699-c15ad7a4cae0/home/device/status")

client = mqtt.Client()

def on_connect(client, userdata, flags, rc):
    print(f"MQTT connected with code {rc}")
    #subscribe ke topic status untuk menerima update dari perangkat
    client.subscribe(TOPIC_STATUS)

def on_message(client, userdata, msg):
    message = msg.payload.decode()
    print(f"Received message '{message}' from topic '{msg.topic}'")
    
    # Di sini kamu bisa menambahkan logika untuk menangani pesan yang diterima
    if msg.topic == "b51328ec-42ca-4163-a699-c15ad7a4cae0/home/device/status":
        # Proses status perangkat yang diterima
        print(f"Device status: {message}")
        # Kamu bisa update status perangkat di database atau mengirimkan ke frontend

# inisisalisasi dan koneksi
def init_mqtt():
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
    client.loop_start()
    
# fungsi untuk publish perintah kontrol ke perangkat
def publish_control(action: str):
    """Action: misal 'ON atau 'OFF'"""
    client.publish(TOPIC_DEVICE, action)
    print(f"[MQTT] Published '{action}' to {TOPIC_DEVICE}")