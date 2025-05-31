// src/pages/RfidLogPage.jsx
import React, { useState, useEffect } from 'react';
import { fetchLogs } from '../services/apiService';
// import './RfidLogPage.css'; // Buat file CSS jika perlu

function RfidLogPage() {
  const [rfidLogs, setRfidLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const getLogs = async () => {
      setIsLoading(true);
      try {
        const allLogs = await fetchLogs();
        // Filter log yang memiliki field 'rfid_id' (ini menandakan log RFID)
        const filteredLogs = Array.isArray(allLogs) 
          ? allLogs.filter(log => typeof log.rfid_id !== 'undefined') 
          : [];
        setRfidLogs(filteredLogs);
      } catch (err) {
        setError(err.message || 'Gagal memuat log RFID.');
      } finally {
        setIsLoading(false);
      }
    };
    getLogs();
  }, []);

  if (isLoading) return <p>Memuat log RFID...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div className="page-container rfid-log-page">
      <h2>Log Aktivitas RFID Doorlock</h2>
      {rfidLogs.length === 0 ? (
        <p>Tidak ada aktivitas RFID tercatat.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>ID RFID</th>
              <th>Status Akses</th>
              {/* Tambahkan ID Log dari MongoDB jika perlu */}
              {/* <th>Log ID</th> */}
            </tr>
          </thead>
          <tbody>
            {rfidLogs.map(log => (
              <tr key={log._id}>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
                <td>{log.rfid_id}</td>
                <td style={{ color: log.status === 'granted' ? 'green' : 'red' }}>
                  {log.status}
                </td>
                {/* <td>{log._id}</td> */}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default RfidLogPage;