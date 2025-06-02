// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'; // Impor useLocation
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UserManagementPage from './pages/UserManagementPage';
import RfidLogPage from './pages/RfidLogPage';
import ManageDevicesPage from './pages/ManageDevicesPage'; // Pastikan komponen ini sudah dibuat
import ManageRfidPage from './pages/ManagesRfidPage';
import { logoutUser, clearTokens } from './services/apiService';
import {
  HomeIcon as DashboardIcon,
  UsersIcon,
  ClipboardDocumentListIcon as LogIcon,
  Cog6ToothIcon as ManageDeviceIcon,
  ArrowLeftOnRectangleIcon as LogoutIcon,
  HomeModernIcon,
  KeyIcon // <-- TAMBAHKAN KeyIcon DI SINI
} from '@heroicons/react/24/outline';
import './App.css';

function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Komponen untuk NavLink kustom agar bisa menambahkan kelas 'active'
function NavLink({ to, children, ...props }) {
  let location = useLocation();
  let isActive = location.pathname === to;

  // Jika to adalah "/", maka kita juga ingin match jika pathname dimulai dengan "/" dan tidak ada sub-path lain yang lebih spesifik
  if (to === "/" && location.pathname !== "/") {
    isActive = false; 
  }
  // Untuk rute lain, jika ada sub-rute, NavLink ke parent mungkin tidak ingin tetap aktif
  // Contoh: jika di /users/detail, NavLink /users mungkin tidak ingin aktif.
  // Namun, untuk kasus sederhana ini, perbandingan eksak atau startsWith bisa digunakan.
  // Untuk kesederhanaan, kita gunakan perbandingan eksak untuk NavLink non-root.
  // Jika `to` bukan root, dan `location.pathname` dimulai dengan `to` tapi lebih panjang,
  // kita bisa anggap tidak aktif, kecuali jika memang diinginkan (misalnya breadcrumbs).
  // Untuk menu utama, biasanya perbandingan eksak atau `startsWith` untuk path dasar sudah cukup.

  return (
    <Link to={to} className={isActive ? 'active' : ''} {...props}>
      {children}
    </Link>
  );
}


function AppLayout({ onLogout, children, mqttStatus }) {
  return (
    <div className="app-layout">
      <nav className="main-nav">
        <div className="nav-brand">
          <Link to="/"> {/* Link brand ke dashboard */}
            <HomeModernIcon className="nav-brand-icon" /> Smarthome
          </Link>
        </div>
        <ul>
          {/* Gunakan NavLink kustom untuk styling active */}
          <li><NavLink to="/"><DashboardIcon className="nav-menu-icon" />Dashboard</NavLink></li>
          <li><NavLink to="/users"><UsersIcon className="nav-menu-icon" />Pengguna</NavLink></li>
          <li><NavLink to="/rfid-logs"><LogIcon className="nav-menu-icon" />Log RFID</NavLink></li>
          <li><NavLink to="/manage-devices"><ManageDeviceIcon className="nav-menu-icon" />Kelola Perangkat</NavLink></li>
          <li><Link to="/manage-rfid"><KeyIcon className="nav-menu-icon" />Kelola RFID</Link></li>
        </ul>
        <div className="nav-right-section">
          <div className="mqtt-status-nav">
            <span className={`status-indicator ${mqttStatus ? mqttStatus.toLowerCase() : 'disconnected'}`}></span>
            MQTT: {mqttStatus || 'Disconnected'}
          </div>
          <button onClick={onLogout} className="logout-button-nav">
            <LogoutIcon className="nav-menu-icon logout-icon-button" /> Logout
          </button>
        </div>
      </nav>
      <main className="content-area">
        {children}
      </main>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'));
  const [globalMqttStatus, setGlobalMqttStatus] = useState('Disconnected');

  const checkAuth = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    setIsAuthenticated(!!token);
  }, []);

  const handleAuthErrorLogout = useCallback(() => {
    console.log('Auth error event received, logging out...');
    clearTokens(); // Pastikan clearTokens diimpor dari apiService
    setIsAuthenticated(false);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    logoutUser(); // logoutUser dari apiService sudah memanggil clearTokens
    setIsAuthenticated(false);
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
          <Route 
            path="/login" 
            element={!isAuthenticated ? <LoginPage onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/*" // Ini akan menangkap semua rute lain
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <AppLayout onLogout={handleLogout} mqttStatus={globalMqttStatus}>
                  <Routes> {/* Nested Routes untuk halaman di dalam AppLayout */}
                    <Route 
                      path="/" // Path relatif terhadap "/*" dari parent, jadi ini adalah root setelah login
                      element={<DashboardPage 
                                  onLogout={handleLogout} // onLogout diteruskan lagi jika Dashboard punya tombol logout sendiri (sebaiknya tidak)
                                  setGlobalMqttStatus={setGlobalMqttStatus} 
                                />} 
                    />
                    {/* === TAMBAHKAN RUTE BERIKUT === */}
                    <Route path="/users" element={<UserManagementPage />} />
                    <Route path="/rfid-logs" element={<RfidLogPage />} />
                    <Route path="/manage-devices" element={<ManageDevicesPage />} />
                    <Route path="/manage-rfid" element={<ManageRfidPage />} />
                    
                    
                    {/* Fallback untuk rute yang tidak cocok di dalam AppLayout, arahkan ke dashboard */}
                    <Route path="*" element={<Navigate to="/" replace />} /> 
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