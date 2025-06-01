// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UserManagementPage from './pages/UserManagementPage';
import RfidLogPage from './pages/RfidLogPage';
import ManageDevicesPage from './pages/ManageDevicesPage';
import { logoutUser, clearTokens } from './services/apiService';
import { 
  HomeIcon as DashboardIcon, // Mengganti nama agar lebih jelas
  UsersIcon, 
  ClipboardDocumentListIcon as LogIcon, // Mengganti nama
  Cog6ToothIcon as ManageDeviceIcon, // Mengganti nama
  ArrowLeftOnRectangleIcon as LogoutIcon,
  HomeModernIcon // Untuk brand/logo utama
} from '@heroicons/react/24/outline';
import './App.css';

function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Komponen AppLayout sekarang akan menerima mqttStatus
function AppLayout({ onLogout, children, mqttStatus }) {
  return (
    <div className="app-layout">
      <nav className="main-nav">
        <div className="nav-brand">
          <Link to="/">
            <HomeModernIcon className="nav-brand-icon" /> Smarthome
          </Link>
        </div>
        <ul>
          <li><Link to="/"><DashboardIcon className="nav-menu-icon" />Dashboard</Link></li>
          <li><Link to="/users"><UsersIcon className="nav-menu-icon" />Pengguna</Link></li>
          <li><Link to="/rfid-logs"><LogIcon className="nav-menu-icon" />Log RFID</Link></li>
          <li><Link to="/manage-devices"><ManageDeviceIcon className="nav-menu-icon" />Kelola Perangkat</Link></li>
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
  const [globalMqttStatus, setGlobalMqttStatus] = useState('Disconnected'); // State global MQTT

  const checkAuth = useCallback(() => { /* ... seperti sebelumnya ... */ }, []);
  const handleAuthErrorLogout = useCallback(() => { /* ... seperti sebelumnya ... */ }, []);
  const handleLoginSuccess = useCallback(() => { setIsAuthenticated(true); }, []);
  const handleLogout = useCallback(() => { /* ... seperti sebelumnya ... */ }, []);

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
            path="/*"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <AppLayout onLogout={handleLogout} mqttStatus={globalMqttStatus}> {/* mqttStatus diteruskan ke AppLayout */}
                  <Routes>
                    <Route 
                      path="/" 
                      element={<DashboardPage 
                                  onLogout={handleLogout} 
                                  setGlobalMqttStatus={setGlobalMqttStatus} // <-- PASTIKAN PROP INI DIKIRIM
                                />} 
                    />
                    {/* ... rute lain ... */}
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