// src/components/DeviceCard.jsx
import React from 'react';
import { 
  LightBulbIcon, // Untuk tipe 'relay' atau 'lampu'
  AdjustmentsHorizontalIcon, // Untuk tipe 'relay' umum
  CpuChipIcon, // Untuk tipe 'sensor'
  QuestionMarkCircleIcon // Default jika tipe tidak dikenali
} from '@heroicons/react/24/outline'; 

// Terima prop onToggle dari parent
function DeviceCard({ device, onToggle }) {
  console.log("DeviceCard RENDERED with device:", device, "and onToggle:", typeof onToggle); // LOG A.1

  if (!device || typeof device.device_id === 'undefined') {
    console.warn("DeviceCard: device prop is null or missing device_id", device);
    return null;
  }

  const handleInternalToggleClick = () => {
    const newAction = device.status === 'ON' ? 'OFF' : 'ON';
    console.log(`DeviceCard: Button clicked! deviceId: ${device.device_id}, newAction: ${newAction}`); // LOG A.2
    if (typeof onToggle === 'function') {
      console.log("DeviceCard: Calling onToggle prop..."); // LOG A.3
      onToggle(device.device_id, newAction);
    } else {
      console.error("DeviceCard: onToggle prop is NOT a function or is undefined!", onToggle); // LOG A.4
    }
  };

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
  const deviceType = device.type || 'unknown'; // Beri default jika tipe tidak ada
  const deviceStatus = typeof device.status === 'string' ? device.status.toUpperCase() : 'UNKNOWN';

  // Pilih ikon berdasarkan tipe perangkat
  let DeviceTypeIcon = QuestionMarkCircleIcon; // Default
  if (deviceType.toLowerCase().includes('lampu') || (deviceType.toLowerCase() === 'relay' && deviceName.toLowerCase().includes('lampu'))) {
    DeviceTypeIcon = LightBulbIcon;
  } else if (deviceType.toLowerCase() === 'relay') {
    DeviceTypeIcon = AdjustmentsHorizontalIcon;
  } else if (deviceType.toLowerCase() === 'sensor') {
    DeviceTypeIcon = CpuChipIcon;
  }
  // Tambahkan kondisi lain untuk tipe perangkat yang berbeda

  return (
    <div className={`device-card ${deviceStatus === 'ON' ? 'device-on' : 'device-off'}`}>
      <div className="card-header"> 
        <DeviceTypeIcon className="device-icon" /> {/* Tampilkan ikon */}
        <h3>{deviceName}</h3>
      </div>
      <p>Tipe: {deviceType}</p>
      <p>Status: <strong>{deviceStatus}</strong></p>
      <button onClick={handleInternalToggleClick} className="toggle-button">
        {deviceStatus === 'ON' ? 'Matikan' : 'Nyalakan'}
      </button>
    </div>
  );
}

export default DeviceCard;