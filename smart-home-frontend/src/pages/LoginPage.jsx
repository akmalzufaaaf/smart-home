// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { loginUser } from '../services/apiService';
import { UserCircleIcon, LockClosedIcon, HomeModernIcon } from '@heroicons/react/24/outline'; // Impor ikon

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
      onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Login gagal. Periksa kembali username dan password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit} className="login-form">
        <div className="login-logo-container">
          <HomeModernIcon className="login-logo-icon" /> {/* Contoh ikon logo */}
          <h2>Login Smarthome</h2>
        </div>
        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <div className="input-with-icon">
            <UserCircleIcon className="input-icon" />
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username" // Tambahkan placeholder
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <div className="input-with-icon">
            <LockClosedIcon className="input-icon" />
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password" // Tambahkan placeholder
              required
            />
          </div>
        </div>
        {error && <p className="login-error">{error}</p>}
        <button type="submit" disabled={loading} className="login-button">
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;