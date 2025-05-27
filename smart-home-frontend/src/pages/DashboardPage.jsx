// src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import mqtt from 'mqtt'; // Pastikan impor ini benar
import { fetchDevices, toggleDeviceApi } from '../services/apiService';
import DeviceCard from '../components/DeviceCards.jsx'; // PERIKSA NAMA FILE ini (DeviceCard vs DeviceCards)
import {
  MQTT_BROKER_URL,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  MQTT_TOPIC_STATUS_BASE,
} from '../config/contants.js'; // PERIKSA NAMA FILE ini (constants vs contants)

function DashboardPage({ onLogout }) {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [mqttClient, setMqttClient] = useState(null);
  const [mqttStatus, setMqttStatus] = useState('Disconnected');
  
  const devicesRef = useRef(devices); // Untuk akses `devices` terbaru di callback MQTT

  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  const loadDevices = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      console.log("Fetching devices...");
      const devicesData = await fetchDevices();
      console.log("Devices data received from API:", devicesData);
      if (Array.isArray(devicesData)) {
        setDevices(devicesData);
      } else {
        console.error("Data perangkat yang diterima dari API bukan array:", devicesData);
        setDevices([]);
      }
    } catch (err) {
      console.error("Error fetching devices:", err.message, err.response?.data);
      setError(err.message || 'Gagal memuat perangkat.');
      if (err.response && (err.response.status === 401 || err.response.status === 422)) {
        if (typeof onLogout === 'function') {
            onLogout();
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [onLogout]); // `onLogout` sebagai dependensi

  useEffect(() => {
    loadDevices();
  }, [loadDevices]); // `loadDevices` sebagai dependensi

  // --- STRUKTUR useEffect UNTUK MQTT ---

  // 1. Effect untuk membuat dan membersihkan instance client MQTT
  useEffect(() => {
    console.log('MQTT Effect (1 - Mount/Config Change): Attempting to initialize client...');
    const clientOptions = {
      clientId: `smarthome_frontend_${Math.random().toString(16).slice(2, 8)}`,
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
      connectTimeout: 4000,
      reconnectPeriod: 1000, // Default, biarkan klien mencoba reconnect otomatis
    };
    if (!MQTT_USERNAME) delete clientOptions.username;
    if (!MQTT_PASSWORD) delete clientOptions.password;

    const client = mqtt.connect(MQTT_BROKER_URL, clientOptions);
    setMqttClient(client); // Simpan instance client ke state
    console.log('MQTT Effect (1 - Mount/Config Change): Client instance created and set.');

    // Cleanup effect: dijalankan saat komponen unmount atau konfigurasi broker berubah
    return () => {
      if (client) {
        console.log('MQTT Effect (1 - Unmount/Config Change): Cleaning up client (client.end).');
        client.end(true); // Force close, hentikan upaya reconnect dari instance ini
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [MQTT_BROKER_URL, MQTT_USERNAME, MQTT_PASSWORD]); // Dependensi hanya pada konfigurasi broker

  // 2. Effect untuk menangani event-event dari mqttClient (connect, message, error, close, reconnect)
  useEffect(() => {
    if (!mqttClient) { // Hanya pasang listener jika client sudah dibuat
      return;
    }

    console.log('MQTT Effect (2 - Client Instance Ready): Attaching event listeners.');

    const handleConnect = () => {
      setMqttStatus('Connected');
      console.log('MQTT: Connected!');
      // Logika subscribe dipindahkan ke effect #3
    };

    const handleMessage = (topic, message) => {
      const messageString = message.toString().toUpperCase();
      console.log(`MQTT RAW MESSAGE RECEIVED: Topic='${topic}', Payload='${messageString}'`);
      
      const baseTopicParts = MQTT_TOPIC_STATUS_BASE.split('/').length;
      const topicParts = topic.split('/');
      
      if (topic.startsWith(MQTT_TOPIC_STATUS_BASE) && 
          topic.endsWith("/status") && 
          topicParts.length === baseTopicParts + 2) { 
          
        const deviceIdFromTopic = topicParts[baseTopicParts];
        console.log(`MQTT DEBUG: Extracted deviceIdFromTopic: ${deviceIdFromTopic} from topic ${topic}`);

        setDevices(prevDevices => {
          console.log(`MQTT DEBUG: Updating devices state for ${deviceIdFromTopic}. prevDevices:`, prevDevices);
          let deviceActuallyUpdated = false;
          const updatedDevices = prevDevices.map(d => {
            if (d.device_id === deviceIdFromTopic) {
              if (d.status !== messageString) {
                console.log(`MQTT DEBUG: Device found and status changed! ID: ${d.device_id}. Old status: ${d.status}, New status: ${messageString}`);
                deviceActuallyUpdated = true;
                return { ...d, status: messageString };
              } else {
                console.log(`MQTT DEBUG: Device found but status is the same. ID: ${d.device_id}. Status: ${messageString}`);
              }
            }
            return d;
          });

          if (deviceActuallyUpdated) {
            console.log(`MQTT DEBUG: Devices state WILL be updated. updatedDevices:`, updatedDevices);
            return updatedDevices;
          } else {
            console.log(`MQTT DEBUG: No actual change in device statuses for ${deviceIdFromTopic}, or device not found. Returning previous state.`);
            return prevDevices; 
          }
        });
      } else {
          console.warn("MQTT DEBUG: Message on unhandled topic structure or not a status update:", topic, "Base:", MQTT_TOPIC_STATUS_BASE);
      }
    };

    const handleError = (err) => {
      setMqttStatus('Error');
      console.error('MQTT Connection Error:', err.message, err); 
    };

    const handleClose = () => {
      setMqttStatus('Disconnected');
      console.log('MQTT Disconnected (event handler).');
    };

    const handleReconnect = () => {
      setMqttStatus('Reconnecting...');
      console.log('MQTT Reconnecting...');
    };

    mqttClient.on('connect', handleConnect);
    mqttClient.on('message', handleMessage);
    mqttClient.on('error', handleError);
    mqttClient.on('close', handleClose);
    mqttClient.on('reconnect', handleReconnect);

    // Cleanup listeners saat mqttClient berubah atau komponen unmount
    return () => {
      console.log('MQTT Effect (2 - Client Instance Changed/Unmount): Removing event listeners.');
      mqttClient.off('connect', handleConnect);
      mqttClient.off('message', handleMessage);
      mqttClient.off('error', handleError);
      mqttClient.off('close', handleClose);
      mqttClient.off('reconnect', handleReconnect);
    };
  // Dependensi: mqttClient (agar listener dipasang/dilepas saat instance client berubah), 
  // dan fungsi setter state serta konstanta topik jika mereka bisa berubah (meskipun jarang).
  }, [mqttClient, MQTT_TOPIC_STATUS_BASE, setDevices, setMqttStatus]);

  // 3. Effect untuk subscribe ketika client terkoneksi DAN daftar perangkat (devices) berubah
  useEffect(() => {
    if (mqttClient && mqttClient.connected && Array.isArray(devices) && devices.length > 0) {
      console.log('MQTT Effect (3 - Subscribe): Evaluating subscriptions for devices:', devices);
      devices.forEach(device => {
        if (device && typeof device.device_id !== 'undefined') {
          const topic = `${MQTT_TOPIC_STATUS_BASE}/${device.device_id}/status`;
          mqttClient.subscribe(topic, { qos: 0 }, (err) => {
            if (err) {
              console.error(`MQTT: Failed to subscribe to ${topic}`, err);
            } else {
              console.log(`MQTT: Subscribed to ${topic}`);
            }
          });
        }
      });
      // Di sini Anda mungkin ingin menambahkan logika untuk unsubscribe dari topik perangkat
      // yang sudah tidak ada lagi di `devices` jika daftar perangkat bisa berkurang.
      // Untuk saat ini, subscribe ulang ke topik yang sama biasanya tidak masalah.
    }
  // Jalankan jika mqttClient, status koneksinya, atau daftar devices berubah.
  }, [mqttClient, mqttClient?.connected, devices, MQTT_TOPIC_STATUS_BASE]); 


  const handleToggleDevice = async (deviceId, action) => {
    try {
      await toggleDeviceApi(deviceId, action);
      // UI akan diupdate oleh pesan MQTT, bukan di sini secara optimis
    } catch (err) {
      alert(`Gagal mengubah status perangkat ${deviceId}: ${err.message}`);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Kontrol Panel Smarthome</h1>
        <div className="mqtt-status">
          <span className={`status-indicator ${mqttStatus.toLowerCase()}`}></span>
          Status MQTT: {mqttStatus}
        </div>
        <button onClick={onLogout} className="logout-button">Logout</button>
      </header>
      <main className="dashboard-main">
        <h2>Perangkat Saya</h2>
        {isLoading && <p>Memuat perangkat...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        {!isLoading && !error && devices.length === 0 && (
          <p>Belum ada perangkat terdaftar atau tidak dapat dimuat.</p>
        )}
        {!isLoading && !error && devices.length > 0 && (
          <div className="devices-container">
            {console.log("RENDERING devices in JSX:", devices)}
            {devices.map((device) => (
              <DeviceCard
                key={device.device_id} // Pastikan device.device_id unik
                device={device}
                onToggle={handleToggleDevice}
              />
            ))}
          </div>
        )}
        <button onClick={loadDevices} disabled={isLoading} className="refresh-button">
          Refresh Daftar Perangkat
        </button>
      </main>
    </div>
  );
}

export default DashboardPage;