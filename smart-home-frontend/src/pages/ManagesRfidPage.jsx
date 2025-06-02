// src/pages/ManageRfidPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { fetchValidRfids, addValidRfidApi, deleteValidRfidApi } from '../services/apiService';
// import './ManageRfidPage.css'; // Jika Anda ingin file CSS terpisah

function ManageRfidPage() {
  const [validRfids, setValidRfids] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [newRfidId, setNewRfidId] = useState('');
  const [newUserAssigned, setNewUserAssigned] = useState('');

  const loadValidRfids = useCallback(async () => {
    setIsLoading(true);
    setError(''); // Reset error setiap kali memuat
    try {
      const rfidData = await fetchValidRfids();
      setValidRfids(rfidData || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar ID RFID.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadValidRfids();
  }, [loadValidRfids]);

  const handleAddRfid = async (e) => {
    e.preventDefault();
    if (!newRfidId.trim()) { // Tambahkan .trim() untuk validasi
      alert('ID RFID harus diisi!');
      return;
    }
    // Anda bisa menambahkan validasi lain di sini, misalnya panjang ID RFID
    try {
      await addValidRfidApi({ 
        rfid_id: newRfidId.trim(), 
        user_assigned: newUserAssigned.trim() || null // Kirim null jika kosong
      });
      alert('ID RFID berhasil ditambahkan!');
      setNewRfidId(''); // Reset form
      setNewUserAssigned('');
      loadValidRfids(); // Muat ulang daftar
    } catch (err) {
      alert(`Gagal menambahkan ID RFID: ${err.message || err.error || 'Terjadi kesalahan'}`);
    }
  };

  const handleDeleteRfid = async (rfidId) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus ID RFID ${rfidId}?`)) {
      try {
        await deleteValidRfidApi(rfidId);
        alert('ID RFID berhasil dihapus!');
        loadValidRfids(); // Muat ulang daftar
      } catch (err) {
        alert(`Gagal menghapus ID RFID: ${err.message || err.error || 'Terjadi kesalahan'}`);
      }
    }
  };

  if (isLoading) return <div className="page-container"><p>Memuat daftar ID RFID...</p></div>;
  if (error) return <div className="page-container"><p style={{ color: 'red' }}>Error: {error}</p></div>;

  return (
    <div className="page-container manage-rfid-page"> {/* Gunakan kelas .page-container */}
      <h2>Kelola ID RFID Doorlock</h2>

      {/* Gunakan kelas yang sama dengan form tambah perangkat */}
      <form onSubmit={handleAddRfid} className="add-item-form"> {/* Kelas umum untuk form tambah */}
        <h3>Tambah ID RFID Baru</h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="newRfidId">ID RFID (hasil scan):</label>
            <input 
              type="text" 
              id="newRfidId" 
              value={newRfidId} 
              onChange={(e) => setNewRfidId(e.target.value)} 
              placeholder="Scan atau masukkan ID RFID"
              required 
            />
          </div>
          <div className="form-group">
            <label htmlFor="newUserAssigned">Nama Pengguna (Opsional):</label>
            <input 
              type="text" 
              id="newUserAssigned" 
              value={newUserAssigned} 
              onChange={(e) => setNewUserAssigned(e.target.value)} 
              placeholder="Nama pemilik kartu"
            />
          </div>
        </div>
        <button type="submit" className="add-button">Tambah ID RFID</button>
      </form>

      <h3>Daftar ID RFID Valid</h3>
      {validRfids.length === 0 ? (
        <p>Tidak ada ID RFID valid terdaftar.</p>
      ) : (
        <table className="data-table"> {/* Kelas umum untuk tabel data */}
          <thead>
            <tr>
              <th>ID RFID</th>
              <th>Pengguna Tertaut</th>
              <th>Tanggal Ditambahkan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {validRfids.map(rfid => (
              <tr key={rfid.rfid_id}> {/* Asumsi rfid_id unik */}
                <td>{rfid.rfid_id}</td>
                <td>{rfid.user_assigned || '-'}</td>
                <td>{rfid.added_on ? new Date(rfid.added_on).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</td>
                <td>
                  <button 
                    onClick={() => handleDeleteRfid(rfid.rfid_id)} 
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

export default ManageRfidPage; 