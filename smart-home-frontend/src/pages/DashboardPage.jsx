// src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as mqtt from 'mqtt';
import { fetchDevices, toggleDeviceApi } from '../services/apiService';
import DeviceCard from '../components/DeviceCards.jsx';
import {
  MQTT_BROKER_URL,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  MQTT_TOPIC_STATUS_BASE,
} from '../config/contants.js';

function DashboardPage({ onLogout }) {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [mqttClient, setMqttClient] = useState(null);
  const [mqttStatus, setMqttStatus] = useState('Disconnected');
  const devicesRef = useRef(devices); // Ref untuk mengakses state devices di dalam callback MQTT

  // Update ref setiap kali devices berubah
  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  const loadDevices = useCallback(async () => {
    // ... (fungsi loadDevices tetap sama)
    setIsLoading(true);
    setError('');
    try {
      const devicesData = await fetchDevices();
      setDevices(devicesData || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat perangkat.');
      if (err.response && (err.response.status === 401 || err.response.status === 422)) {
        onLogout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Efek untuk koneksi MQTT
  useEffect(() => {
    if (!mqttClient && devices.length > 0) { // Hanya konek jika ada device dan belum ada client
      const client = mqtt.connect(MQTT_BROKER_URL, {
        clientId: `smarthome_frontend_${Math.random().toString(16).slice(2, 8)}`,
        username: MQTT_USERNAME,
        password: MQTT_PASSWORD,
        // Opsi lain jika perlu
      });

      setMqttClient(client);

      client.on('connect', () => {
        setMqttStatus('Connected');
        console.log('MQTT Connected!');
        // Subscribe ke topik status untuk setiap perangkat yang ada
        // Asumsi topik status: MQTT_TOPIC_STATUS_BASE/<device_id>/status
        devicesRef.current.forEach(device => {
          const topic = `<span class="math-inline">\{MQTT\_TOPIC\_STATUS\_BASE\}/</span>{device.device_id}/status`;
          client.subscribe(topic, (err) => {
            if (err) {
              console.error(`Failed to subscribe to ${topic}`, err);
            } else {
              console.log(`Subscribed to ${topic}`);
            }
          });
        });
        // Atau subscribe ke wildcard jika lebih mudah dan backend mendukungnya dengan benar
        // client.subscribe(`${MQTT_TOPIC_STATUS_BASE}/+/status`, ...);
      });

      client.on('message', (topic, message) => {
        const messageString = message.toString().toUpperCase();
        console.log(`MQTT Message: ${topic} - ${messageString}`);

        const topicParts = topic.split('/');
        // Asumsi: .../BASE_TOPIC/DEVICE_ID/status
        const deviceIdFromTopic = topicParts[topicParts.length - 2];

        setDevices(prevDevices =>
          prevDevices.map(d =>
            d.device_id === deviceIdFromTopic ? { ...d, status: messageString } : d
          )
        );
      });

      client.on('error', (err) => {
        setMqttStatus('Error');
        console.error('MQTT Error:', err);
        client.end(); // Tutup koneksi jika ada error signifikan
      });

      client.on('close', () => {
        setMqttStatus('Disconnected');
        console.log('MQTT Disconnected');
      });

      client.on('reconnect', () => {
        setMqttStatus('Reconnecting...');
      });

      return () => {
        if (client) {
          client.end();
          setMqttClient(null);
          setMqttStatus('Disconnected');
        }
      };
    }
  }, [mqttClient, devices]); // Tambahkan devices sebagai dependency


  const handleToggleDevice = async (deviceId, action) => {
    try {
      await toggleDeviceApi(deviceId, action); // API call akan trigger backend untuk publish ke MQTT
      // Kita tidak perlu update optimis di sini lagi karena MQTT akan handle
      // setDevices(prevDevices =>
      //   prevDevices.map(d =>
      //     d.device_id === deviceId ? { ...d, status: action } : d
      //   )
      // );
    } catch (err) {
      alert(`Gagal mengubah status perangkat ${deviceId}: ${err.message}`);
    }
  };

  // ... (JSX return tetap sama, mungkin tambahkan tampilan status MQTT)
  return (
    <div className="dashboard">
      <header>
        <h1>Kontrol Panel Smarthome</h1>
        <p>Status MQTT: {mqttStatus}</p>
        <button onClick={onLogout}>Logout</button>
      </header>
      {/* ... sisa JSX ... */}
      <main>
        <h2>Perangkat Saya</h2>
        {isLoading && <p>Memuat perangkat...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        {!isLoading && !error && devices.length === 0 && (
          <p>Belum ada perangkat terdaftar atau tidak dapat dimuat.</p>
        )}
        {!isLoading && !error && devices.length > 0 && (
          <div className="devices-container">
            {devices.map((device) => (
              <DeviceCard
                key={device.device_id}
                device={device}
                onToggle={handleToggleDevice}
              />
            ))}
          </div>
        )}
        <button onClick={loadDevices} disabled={isLoading} style={{marginTop: '20px'}}>
          Refresh Daftar Perangkat
        </button>
      </main>
    </div>
  );
}

export default DashboardPage;