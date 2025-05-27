// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { loginUser } from '../services/apiService';
// import './LoginPage.css'; // Jika kamu membuat file CSS terpisah

function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginUser({ username, password });
      onLoginSuccess(); // Panggil callback setelah login sukses
    } catch (err) {
      setError(err.message || 'Login gagal. Periksa kembali username dan password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page"> {/* Terapkan kelas CSS */}
      <form onSubmit={handleSubmit} className="login-form"> {/* Terapkan kelas CSS */}
        <h2>Login Smarthome</h2>
        <div className="form-group"> {/* Terapkan kelas CSS */}
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group"> {/* Terapkan kelas CSS */}
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="login-error">{error}</p>} {/* Terapkan kelas CSS */}
        <button type="submit" disabled={loading} className="login-button"> {/* Terapkan kelas CSS */}
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;