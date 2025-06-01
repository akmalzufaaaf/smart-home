// src/config/constants.js
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://64.23.167.116:31435';

// Ganti dengan URL broker MQTT WebSocket kamu
export const MQTT_BROKER_URL = import.meta.env.VITE_MQTT_BROKER_URL || 'ws://64.23.167.116:32020';
export const MQTT_USERNAME = import.meta.env.VITE_MQTT_USERNAME || '';
export const MQTT_PASSWORD = import.meta.env.VITE_MQTT_PASSWORD || '';

// Base topik MQTT (sesuaikan dengan backendmu)
// Contoh: "b51328ec-42ca-4163-a699-c15ad7a4cae0/home/device"
// Di backend, device_id dan /control atau /status akan ditambahkan
export const MQTT_TOPIC_STATUS_BASE = import.meta.env.VITE_MQTT_TOPIC_STATUS_BASE || "home/device";
export const MQTT_TOPIC_DEVICE_CONTROL_BASE = "home/device";