// src/pages/UserManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { fetchUsers } from '../services/apiService';
// import './UserManagementPage.css'; // Buat file CSS jika perlu styling khusus

function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const getUsers = async () => {
      setIsLoading(true);
      try {
        const usersData = await fetchUsers();
        setUsers(usersData || []);
      } catch (err) {
        setError(err.message || 'Gagal memuat daftar pengguna.');
      } finally {
        setIsLoading(false);
      }
    };
    getUsers();
  }, []);

  if (isLoading) return <p>Memuat pengguna...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div className="page-container user-management-page">
      <h2>Manajemen Pengguna</h2>
      {users.length === 0 ? (
        <p>Tidak ada pengguna terdaftar.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID Pengguna</th>
              <th>Username</th>
              {/* Tambahkan kolom lain jika ada, misal role, tanggal join, dll. */}
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>{user._id}</td>
                <td>{user.username}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default UserManagementPage;