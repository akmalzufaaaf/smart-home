// src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import mqtt from 'mqtt';
import { fetchDevices, toggleDeviceApi } from '../services/apiService';
import DeviceCard from '../components/DeviceCards.jsx'; // PASTIKAN NAMA FILE INI BENAR
import {
  MQTT_BROKER_URL, // Ini harusnya ws://<IP_VPS_ANDA>:<NODEPORT_MQTT_WS>
  MQTT_USERNAME,
  MQTT_PASSWORD,
  MQTT_TOPIC_STATUS_BASE, // Ini harusnya base topic seperti "home/device" atau apa pun yang Anda set
} from '../config/contants.js'; // PASTIKAN NAMA FILE INI BENAR

function DashboardPage({ onLogout, setGlobalMqttStatus }) { // Terima setGlobalMqttStatus
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [mqttClient, setMqttClient] = useState(null);
  
  const devicesRef = useRef(devices); 
  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  const loadDevices = useCallback(async () => {
    // ... (fungsi loadDevices seperti sebelumnya, pastikan memanggil setDevices) ...
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
  }, [onLogout]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // 1. Effect untuk membuat dan membersihkan instance client MQTT
  useEffect(() => {
    console.log('MQTT Effect (1 - Mount/Config Change): Attempting to initialize client with URL:', MQTT_BROKER_URL);
    const clientOptions = {
      clientId: `smarthome_frontend_${Math.random().toString(16).slice(2, 8)}`,
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
      connectTimeout: 10000, // Tingkatkan timeout koneksi
      reconnectPeriod: 5000, // Interval reconnect
    };
    if (!MQTT_USERNAME) delete clientOptions.username;
    if (!MQTT_PASSWORD) delete clientOptions.password;

    const client = mqtt.connect(MQTT_BROKER_URL, clientOptions);
    setMqttClient(client); 
    console.log('MQTT Effect (1 - Mount/Config Change): Client instance created.');
    if (typeof setGlobalMqttStatus === 'function') {
        setGlobalMqttStatus('Connecting...');
    }

    return () => {
      if (client) {
        console.log('MQTT Effect (1 - Unmount/Config Change): Cleaning up client (client.end).');
        client.end(true); 
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [MQTT_BROKER_URL, MQTT_USERNAME, MQTT_PASSWORD]); // Hanya dependensi ini

  // 2. Effect untuk menangani event-event dari mqttClient
  useEffect(() => {
    if (!mqttClient) {
      console.log('MQTT Effect (2 - Client Listeners): No client instance yet.');
      return;
    }

    console.log('MQTT Effect (2 - Client Instance Ready): Attaching event listeners.');

    const handleConnect = () => {
      if (typeof setGlobalMqttStatus === 'function') setGlobalMqttStatus('Connected');
      console.log('MQTT: Connected!');
      // Subscribe dilakukan di effect #3
    };

    const handleMessage = (topic, message) => {
      const messageString = message.toString().toUpperCase();
      // Log paling dasar untuk setiap pesan yang masuk
      console.log(`RAW MQTT MESSAGE RECEIVED: Topic='${topic}', Payload='${messageString}'`);
      
      // Pastikan MQTT_TOPIC_STATUS_BASE tidak kosong atau undefined
      if (!MQTT_TOPIC_STATUS_BASE) {
        console.error("MQTT_TOPIC_STATUS_BASE is not defined!");
        return;
      }
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
      if (typeof setGlobalMqttStatus === 'function') setGlobalMqttStatus('Error');
      console.error('MQTT Connection Error:', err.message, err); 
    };

    const handleClose = () => {
      if (typeof setGlobalMqttStatus === 'function') setGlobalMqttStatus('Disconnected');
      console.log('MQTT Disconnected (event handler).');
    };

    const handleReconnect = () => {
      if (typeof setGlobalMqttStatus === 'function') setGlobalMqttStatus('Reconnecting...');
      console.log('MQTT Reconnecting...');
    };

    mqttClient.on('connect', handleConnect);
    mqttClient.on('message', handleMessage);
    mqttClient.on('error', handleError);
    mqttClient.on('close', handleClose);
    mqttClient.on('reconnect', handleReconnect);

    return () => {
      console.log('MQTT Effect (2 - Client Instance Changed/Unmount): Removing event listeners.');
      mqttClient.off('connect', handleConnect);
      mqttClient.off('message', handleMessage);
      mqttClient.off('error', handleError);
      mqttClient.off('close', handleClose);
      mqttClient.off('reconnect', handleReconnect);
    };
  }, [mqttClient, MQTT_TOPIC_STATUS_BASE, setDevices, setGlobalMqttStatus]);

  // 3. Effect untuk subscribe ketika client terkoneksi DAN daftar perangkat (devices) berubah
  useEffect(() => {
    if (mqttClient && mqttClient.connected && Array.isArray(devices) && devices.length > 0) {
      console.log('MQTT Effect (3 - Subscribe): Evaluating subscriptions for devices:', devices);
      devices.forEach(device => {
        if (device && typeof device.device_id !== 'undefined') {
          const topic = `${MQTT_TOPIC_STATUS_BASE}/${device.device_id}/status`;
          console.log(`MQTT Attempting to subscribe to: ${topic}`); // Log sebelum subscribe
          mqttClient.subscribe(topic, { qos: 0 }, (err) => {
            if (err) {
              console.error(`MQTT: Failed to subscribe to ${topic}`, err);
            } else {
              console.log(`MQTT: Subscribed to ${topic}`);
            }
          });
        }
      });
    } else {
        if (mqttClient && mqttClient.connected) {
            console.log('MQTT Effect (3 - Subscribe): No devices to subscribe to, or devices array is empty.');
        }
    }
  }, [mqttClient, mqttClient?.connected, devices, MQTT_TOPIC_STATUS_BASE]); 


  const handleToggleDevice = async (deviceId, action) => { /* ... seperti sebelumnya ... */ };

  return (
    <div className="dashboard">
      {/* Header yang menampilkan judul dan status MQTT sekarang ada di AppLayout */}
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