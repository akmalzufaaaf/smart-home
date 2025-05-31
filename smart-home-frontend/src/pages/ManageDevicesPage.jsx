// src/pages/ManageDevicesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { fetchDevices, registerDeviceApi, deleteDeviceApi } from '../services/apiService';
// import './ManageDevicesPage.css'; // Buat file CSS jika perlu

function ManageDevicesPage() {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // State untuk form tambah perangkat
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState('relay'); // Default type

  const loadDevices = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const devicesData = await fetchDevices();
      setDevices(devicesData || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat perangkat.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    if (!newDeviceId || !newDeviceName || !newDeviceType) {
      alert('Semua field harus diisi!');
      return;
    }
    try {
      await registerDeviceApi({ 
        device_id: newDeviceId, 
        name: newDeviceName, 
        type: newDeviceType 
      });
      alert('Perangkat berhasil ditambahkan!');
      setNewDeviceId(''); // Reset form
      setNewDeviceName('');
      setNewDeviceType('relay');
      loadDevices(); // Muat ulang daftar perangkat
    } catch (err) {
      alert(`Gagal menambahkan perangkat: ${err.message}`);
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus perangkat ${deviceId}?`)) {
      try {
        await deleteDeviceApi(deviceId);
        alert('Perangkat berhasil dihapus!');
        loadDevices(); // Muat ulang daftar perangkat
      } catch (err) {
        alert(`Gagal menghapus perangkat: ${err.message}`);
      }
    }
  };

  if (isLoading) return <p>Memuat perangkat...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div className="page-container manage-devices-page">
      <h2>Kelola Perangkat</h2>

      <form onSubmit={handleRegisterDevice} className="add-device-form">
        <h3>Tambah Perangkat Baru</h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="newDeviceId">ID Perangkat:</label>
            <input 
              type="text" 
              id="newDeviceId" 
              value={newDeviceId} 
              onChange={(e) => setNewDeviceId(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label htmlFor="newDeviceName">Nama Perangkat:</label>
            <input 
              type="text" 
              id="newDeviceName" 
              value={newDeviceName} 
              onChange={(e) => setNewDeviceName(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label htmlFor="newDeviceType">Tipe Perangkat:</label>
            <select 
              id="newDeviceType" 
              value={newDeviceType} 
              onChange={(e) => setNewDeviceType(e.target.value)}
            >
              <option value="relay">Relay</option>
              <option value="sensor">Sensor</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>
        </div>
        <button type="submit" className="add-button">Tambah Perangkat</button>
      </form>

      <h3>Daftar Perangkat Terdaftar</h3>
      {devices.length === 0 ? (
        <p>Tidak ada perangkat terdaftar.</p>
      ) : (
        <table className="devices-table">
          <thead>
            <tr>
              <th>ID Perangkat</th>
              <th>Nama</th>
              <th>Tipe</th>
              <th>Status Saat Ini</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {devices.map(device => (
              <tr key={device.device_id}>
                <td>{device.device_id}</td>
                <td>{device.name}</td>
                <td>{device.type}</td>
                <td>{device.status || 'N/A'}</td>
                <td>
                  <button 
                    onClick={() => handleDeleteDevice(device.device_id)} 
                    className="delete-button"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ManageDevicesPage;