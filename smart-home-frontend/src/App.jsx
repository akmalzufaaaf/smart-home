// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'; // Impor komponen Router
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UserManagementPage from './pages/UserManagementPage'; // Impor halaman baru
import RfidLogPage from './pages/RfidLogPage'; // Impor halaman baru
import { logoutUser, clearTokens } from './services/apiService';
import './App.css';

// Komponen ProtectedRoute untuk melindungi rute
function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Komponen Layout Sederhana dengan Navigasi
function AppLayout({ onLogout, children }) {
  return (
    <div className="app-layout">
      <nav className="main-nav">
        <ul>
          <li><Link to="/">Dashboard</Link></li>
          <li><Link to="/users">Manajemen Pengguna</Link></li>
          <li><Link to="/rfid-logs">Log RFID</Link></li>
          <li><button onClick={onLogout} className="logout-button-nav">Logout</button></li>
        </ul>
      </nav>
      <main className="content-area">
        {children}
      </main>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'));

  const checkAuth = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    setIsAuthenticated(!!token);
  }, []);

  const handleAuthErrorLogout = useCallback(() => {
    console.log('Auth error event received, logging out...');
    clearTokens();
    setIsAuthenticated(false);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    logoutUser();
    setIsAuthenticated(false);
    // Tidak perlu <Navigate> di sini, routing akan menangani
  }, []);

  useEffect(() => {
    checkAuth();
    window.addEventListener('auth-error-logout', handleAuthErrorLogout);
    return () => {
      window.removeEventListener('auth-error-logout', handleAuthErrorLogout);
    };
  }, [checkAuth, handleAuthErrorLogout]);

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <LoginPage onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" />} />
          
          <Route 
            path="/*" // Semua rute lain akan menggunakan AppLayout
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <AppLayout onLogout={handleLogout}>
                  <Routes> {/* Rute di dalam layout */}
                    <Route path="/" element={<DashboardPage onLogout={handleLogout} />} />
                    <Route path="/users" element={<UserManagementPage />} />
                    <Route path="/rfid-logs" element={<RfidLogPage />} />
                    {/* Tambahkan rute lain di sini jika perlu */}
                    <Route path="*" element={<Navigate to="/" />} /> {/* Fallback jika rute tidak ditemukan */}
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;