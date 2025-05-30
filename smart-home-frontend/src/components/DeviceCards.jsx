// src/components/DeviceCard.jsx
import React from 'react';

// Terima prop onToggle dari parent
function DeviceCard({ device, onToggle }) {
  if (!device) return null;

  const handleToggleClick = ().jsx
    const newAction = device.status === 'ON' ? 'OFF' : 'ON';
    onToggle(device.device_id, newAction); // Kirim device_id dan action baru
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
};

export default DeviceCard;