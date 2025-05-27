// src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import mqtt from 'mqtt'; // Pastikan impor ini sudah benar (default import)
import { fetchDevices, toggleDeviceApi } from '../services/apiService';
import DeviceCard from '../components/DeviceCards.jsx'; // PERIKSA NAMA FILE: DeviceCard.jsx atau DeviceCards.jsx?
import {
  MQTT_BROKER_URL,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  MQTT_TOPIC_STATUS_BASE,
} from '../config/contants.js'; // PERIKSA NAMA FILE: constants.js atau contants.js?

function DashboardPage({ onLogout }) {  
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [mqttClient, setMqttClient] = useState(null);
  const [mqttStatus, setMqttStatus] = useState('Disconnected');
  
  const devicesRef = useRef(devices);
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
        console.error("Data perangkat yang diterima bukan array:", devicesData);
        setDevices([]);
      }
    } catch (err) {
      console.error("Error fetching devices:", err.message, err.response?.data);
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

  // --- STRUKTUR useEffect UNTUK MQTT YANG DIREKOMENDASIKAN ---

// 1. Effect untuk membuat dan membersihkan koneksi MQTT
useEffect(() => {
  console.log('MQTT Effect (Mount): Attempting to initialize client...');
  const clientOptions = {
    clientId: `smarthome_frontend_${Math.random().toString(16).slice(2, 8)}`,
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
  };
  if (!MQTT_USERNAME) delete clientOptions.username;
  if (!MQTT_PASSWORD) delete clientOptions.password;

  const client = mqtt.connect(MQTT_BROKER_URL, clientOptions);
  setMqttClient(client); // Simpan instance client
  console.log('MQTT Effect (Mount): Client instance created and set.');

  // Cleanup effect: dijalankan saat komponen benar-benar akan di-unmount
  return () => {
    if (client) {
      console.log('MQTT Effect (Unmount): Cleaning up client.');
      client.end(true); // Force close, jangan biarkan reconnect otomatis dari instance ini
      // PENTING: JANGAN panggil setMqttClient(null) di sini jika effect ini
      // hanya bergantung pada prop konfigurasi yang jarang berubah.
      // Biarkan state mqttClient tetap ada sampai komponen benar-benar dihancurkan
      // atau di-reset oleh logika logout misalnya.
    }
  };
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [MQTT_BROKER_URL, MQTT_USERNAME, MQTT_PASSWORD]); // Dependensi HANYA pada konfigurasi broker

  // 2. Effect untuk menangani event-event dari mqttClient (connect, message, error, close, reconnect)
  useEffect(() => {
    if (mqttClient) {
      console.log('MQTT Effect (Client Ready): Attaching event listeners.');

      const handleConnect = () => {
        setMqttStatus('Connected');
        console.log('MQTT Connected!');
        // Logika subscribe dipindahkan ke effect #3
      };

      const handleMessage = (topic, message) => {
        const messageString = message.toString().toUpperCase();
        console.log(`RAW MQTT MESSAGE RECEIVED: Topic='${topic}', Payload='${messageString}'`);
        
        const baseTopicParts = MQTT_TOPIC_STATUS_BASE.split('/').length;
        const topicParts = topic.split('/');
        
        if (topic.startsWith(MQTT_TOPIC_STATUS_BASE) && 
            topic.endsWith("/status") && 
            topicParts.length === baseTopicParts + 2) { 
            
          const deviceIdFromTopic = topicParts[baseTopicParts];
          console.log(`DEBUG: Extracted deviceIdFromTopic: ${deviceIdFromTopic} from topic ${topic}`);

          setDevices(prevDevices => {
            console.log(`DEBUG: Updating devices state for ${deviceIdFromTopic}. prevDevices:`, prevDevices);
            let deviceActuallyUpdated = false;
            const updatedDevices = prevDevices.map(d => {
              if (d.device_id === deviceIdFromTopic) {
                if (d.status !== messageString) {
                  console.log(`DEBUG: Device found and status changed! ID: ${d.device_id}. Old status: ${d.status}, New status: ${messageString}`);
                  deviceActuallyUpdated = true;
                  return { ...d, status: messageString };
                } else {
                  console.log(`DEBUG: Device found but status is the same. ID: ${d.device_id}. Status: ${messageString}`);
                }
              }
              return d;
            });

            if (deviceActuallyUpdated) {
              console.log(`DEBUG: Devices state WILL be updated. updatedDevices:`, updatedDevices);
              return updatedDevices;
            } else {
              console.log(`DEBUG: No actual change in device statuses for ${deviceIdFromTopic}, or device not found. Returning previous state.`);
              return prevDevices; 
            }
          });
        } else {
            console.warn("DEBUG: MQTT Message on unhandled topic structure or not a status update:", topic, "Base:", MQTT_TOPIC_STATUS_BASE);
        }
      };

      const handleError = (err) => {
        setMqttStatus('Error');
        console.error('MQTT Connection Error:', err.message); 
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

      // Cleanup listeners
      return () => {
        console.log('MQTT Effect (Client Changed/Unmount): Removing event listeners.');
        mqttClient.off('connect', handleConnect);
        mqttClient.off('message', handleMessage);
        mqttClient.off('error', handleError);
        mqttClient.off('close', handleClose);
        mqttClient.off('reconnect', handleReconnect);
      };
    }
  // Hanya jalankan ulang jika mqttClient berubah. setDevices dan setMqttStatus adalah fungsi stabil dari useState.
  // MQTT_TOPIC_STATUS_BASE biasanya konstan.
  }, [mqttClient, MQTT_TOPIC_STATUS_BASE, setDevices, setMqttStatus]);

  // 3. Effect untuk subscribe ketika client terkoneksi DAN daftar perangkat (devices) berubah
  useEffect(() => {
    // Pastikan mqttClient ada, terkoneksi, dan devices adalah array yang punya isi
    if (mqttClient && mqttClient.connected && Array.isArray(devices) && devices.length > 0) {
      console.log('MQTT Effect (Subscribe): Devices list available or client connected, evaluating subscriptions.', devices);
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
      // Pertimbangkan untuk unsubscribe dari topik lama jika `devices` berubah dan beberapa perangkat dihapus.
      // Untuk saat ini, kita biarkan sederhana.
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
            {/* Tambahkan console.log di sini untuk melihat `devices` yang akan dirender */}
            {console.log("RENDERING devices in JSX:", devices)}
            {devices.map((device) => (
              <DeviceCard
                key={device.device_id}
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