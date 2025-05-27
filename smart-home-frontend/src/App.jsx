// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { logoutUser, clearTokens } from './services/apiService'; // Import clearTokens juga jika belum
import './App.css';

  // src/App.jsx
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken')); // Inisialisasi dari localStorage

  const checkAuth = useCallback(() => { // Gunakan useCallback jika diteruskan ke dependency array
    const token = localStorage.getItem('accessToken');
    setIsAuthenticated(!!token);
  }, []);

  useEffect(() => {
    checkAuth(); 

    const handleAuthChange = () => checkAuth();
    // Jika ada event kustom untuk perubahan auth di storage antar tab (jarang diperlukan untuk app sederhana)
    // window.addEventListener('storage', handleAuthChange); 
    window.addEventListener('auth-error-logout', handleAuthErrorLogout); // Dari apiService

    return () => {
      // window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('auth-error-logout', handleAuthErrorLogout);
    };
  }, [checkAuth]);

  const handleAuthErrorLogout = useCallback(() => { // Gunakan useCallback
    console.log('Auth error event received, logging out...');
    clearTokens();
    setIsAuthenticated(false);
  }, []);

  const handleLoginSuccess = useCallback(() => { // Gunakan useCallback
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => { // Gunakan useCallback
    logoutUser(); // Ini memanggil clearTokens()
    setIsAuthenticated(false);
  }, []);

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return <DashboardPage onLogout={handleLogout} />;
}

export default App;