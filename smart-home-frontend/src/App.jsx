// src/App.jsx
import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage'; // Pastikan ini ada
import { logoutUser } from './services/apiService';
import './App.css'; // Kamu bisa menggunakan App.css atau index.css untuk styling dasar

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Cek token saat aplikasi pertama kali dimuat
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    logoutUser();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return <DashboardPage onLogout={handleLogout} />; // Ganti bagian ini
}

export default App;