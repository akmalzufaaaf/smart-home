// src/pages/RfidLogPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
// PERBAIKAN: Hanya impor fungsi yang kita butuhkan
import { fetchRfidLogs } from '../services/apiService'; 
// import './RfidLogPage.css'; // Buat file CSS jika perlu styling khusus

function RfidLogPage() {
  const [rfidLogs, setRfidLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Gunakan useCallback untuk menstabilkan referensi fungsi
  const getLogs = useCallback(async () => {
    setIsLoading(true);
    setError(''); // Reset error setiap kali memuat
    try {
      // PERBAIKAN: Panggil fungsi yang lebih spesifik, fetchRfidLogs()
      const logsData = await fetchRfidLogs();
      
      // Backend sudah memfilter, jadi kita hanya perlu memastikan data adalah array
      // dan mengurutkannya jika backend belum melakukannya.
      if (Array.isArray(logsData)) {
        // Urutkan log dari yang terbaru (jika backend belum melakukannya)
        logsData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setRfidLogs(logsData);
      } else {
        console.error("Data log RFID yang diterima bukan array:", logsData);
        setRfidLogs([]);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat log RFID.');
    } finally {
      setIsLoading(false);
    }
  }, []); // Dependensi kosong, jadi fungsi ini stabil

  useEffect(() => {
    getLogs();
  }, [getLogs]); // Jalankan getLogs saat komponen dimuat

  if (isLoading) {
    // Bungkus dengan page-container agar styling konsisten
    return <div className="page-container"><p>Memuat log RFID...</p></div>;
  }

  if (error) {
    return <div className="page-container"><p style={{ color: 'red' }}>Error: {error}</p></div>;
  }

  return (
    <div className="page-container rfid-log-page">
      <h2>Log Aktivitas RFID Doorlock</h2>
      {rfidLogs.length === 0 ? (
        <p>Tidak ada aktivitas RFID yang tercatat.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>ID RFID</th>
              <th>Status Akses</th>
            </tr>
          </thead>
          <tbody>
            {rfidLogs.map(log => (
              <tr key={log._id}> {/* Gunakan log._id sebagai key unik */}
                <td>{new Date(log.timestamp).toLocaleString('id-ID')}</td>
                {/* PERBAIKAN: Gunakan 'rfid_id_scanned' atau 'rfid_id' sesuai yang dikirim backend */}
                <td>{log.rfid_id_scanned || log.rfid_id || 'N/A'}</td>
                <td style={{ color: log.status === 'granted' ? '#28a745' : '#dc3545', fontWeight: 500 }}>
                  {log.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default RfidLogPage;