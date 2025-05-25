// src/config/constants.js
export const API_BASE_URL = 'http://103.106.231.24:32379';

// Ganti dengan URL broker MQTT WebSocket kamu
export const MQTT_BROKER_URL = 'ws://broker.hivemq.com:8000/mqtt';
export const MQTT_USERNAME = ''; // Isi jika perlu
export const MQTT_PASSWORD = ''; // Isi jika perlu

// Base topik MQTT (sesuaikan dengan backendmu)
// Contoh: "b51328ec-42ca-4163-a699-c15ad7a4cae0/home/device"
// Di backend, device_id dan /control atau /status akan ditambahkan
export const MQTT_TOPIC_DEVICE_CONTROL_BASE = "b51328ec-42ca-4163-a699-c15ad7a4cae0/home/device";
export const MQTT_TOPIC_STATUS_BASE = "b51328ec-42ca-4163-a699-c15ad7a4cae0/home/device";