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

  return (
    <div className={`device-card ${device.status === 'ON' ? 'device-on' : 'device-off'}`}>
      <h3>{device.name || device.device_id}</h3>
      <p>Tipe: {device.type || 'N/A'}</p>
      <p>Status: <strong>{device.status}</strong></p>
      <button onClick={handleToggleClick}>
        {device.status === 'ON' ? 'Matikan' : 'Nyalakan'}
      </button>
    </div>
  );
} // Titik koma di sini bisa dihilangkan untuk konsistensi

export default DeviceCard;