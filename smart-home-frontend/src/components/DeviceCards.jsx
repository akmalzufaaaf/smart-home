// src/components/DeviceCard.jsx
import React from 'react';

// Terima prop onToggle dari parent
function DeviceCard({ device, onToggle }) {
  if (!device) return null;

  // PERBAIKAN: Definisikan sebagai fungsi arrow yang benar
  const handleToggleClick = () => { 
    const newAction = device.status === 'ON' ? 'OFF' : 'ON';
    // Pastikan device.device_id ada dan onToggle adalah fungsi
    if (device && typeof device.device_id !== 'undefined' && typeof onToggle === 'function') {
      onToggle(device.device_id, newAction); // Kirim device_id dan action baru
    } else {
      console.error("Device ID tidak valid atau onToggle bukan fungsi", device);
    }
  };

  const deviceName = device.name || device.device_id || "Nama Tidak Ada";
  const deviceType = device.type || 'N/A';
  const deviceStatus = typeof device.status === 'string' ? device.status.toUpperCase() : 'UNKNOWN';

  return (
    // Terapkan kelas CSS dinamis untuk status ON/OFF
    <div className={`device-card ${deviceStatus === 'ON' ? 'device-on' : 'device-off'}`}>
      <div className="card-header"> 
        {/* Tambahkan ikon di sini jika mau, contoh: */}
        {/* {deviceType === 'relay' && <LightBulbIcon className="device-icon" />} */}
        <h3>{deviceName}</h3>
      </div>
      <p>Tipe: {deviceType}</p>
      <p>Status: <strong>{deviceStatus}</strong></p>
      <button onClick={handleToggleClick} className="toggle-button"> {/* Terapkan kelas CSS */}
        {deviceStatus === 'ON' ? 'Matikan' : 'Nyalakan'}
      </button>
    </div>
  );
}

export default DeviceCard;