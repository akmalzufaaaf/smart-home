// src/services/apiService.js
import axios from 'axios';
// PERBAIKAN: Pastikan nama file adalah 'constants.js' (dengan 's')
import { API_BASE_URL } from '../config/constants.js';

// Pastikan API_BASE_URL memiliki nilai yang valid
console.log("API Service Initialized. Base URL:", API_BASE_URL);
if (!API_BASE_URL) {
    alert("Konfigurasi API_BASE_URL tidak ditemukan! Periksa file .env dan constants.js Anda.");
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Manajemen Token ---

const getAccessToken = () => localStorage.getItem('accessToken');
const getRefreshToken = () => localStorage.getItem('refreshToken');

const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem('accessToken', accessToken);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
    console.log("API Service: Refresh token SAVED to localStorage.");
  } else {
    console.warn("API Service: No refresh token received during login to save.");
  }
};

export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

const refreshToken = async () => {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    console.log('API Service: No refresh token available.');
    return Promise.reject(new Error('No refresh token'));
  }
  try {
    console.log('API Service: Attempting to refresh token...');
    const response = await apiClient.post('/refresh', {}, {
      headers: { Authorization: `Bearer ${currentRefreshToken}` }
    });
    const { access_token } = response.data;
    if (access_token) {
      localStorage.setItem('accessToken', access_token);
      console.log('API Service: Token refreshed successfully.');
      return access_token;
    } else {
      throw new Error('No new access token received from refresh endpoint');
    }
  } catch (error) {
    console.error('API Service: Failed to refresh token.', error.response?.data || error.message);
    clearTokens();
    window.dispatchEvent(new Event('auth-error-logout')); // Trigger logout global
    throw error;
  }
};

// --- Interceptors Axios ---

apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token && config.url !== '/refresh') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest.url !== '/refresh' && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const newAccessToken = await refreshToken();
        isRefreshing = false;
        apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// --- Fungsi Ekspor untuk Fitur Aplikasi ---

export const loginUser = async (credentials) => {
  try {
    const response = await apiClient.post('/login', credentials);
    if (response.data.access_token) {
      setTokens(response.data.access_token, response.data.refresh_token);
    } else {
      throw new Error('No access_token received from login');
    }
    return response.data;
  } catch (error) {
    console.error('API Service: Login failed:', error.response?.data || error.message);
    throw error.response?.data || new Error('Login failed');
  }
};

export const logoutUser = () => {
  clearTokens();
  // Logika tambahan seperti mengarahkan ke halaman login bisa ditangani di App.jsx
};

// --- Fungsi untuk Perangkat (Devices) ---

export const fetchDevices = async () => {
  try {
    const response = await apiClient.get('/api/devices');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch devices:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to fetch devices');
  }
};

export const toggleDeviceApi = async (deviceId, action) => {
  try {
    const payload = { action: action.toUpperCase() };
    const requestUrl = `/api/device/${deviceId}/toggle`;
    const response = await apiClient.post(requestUrl, payload);
    return response.data;
  } catch (error) {
    console.error(`API Service: ERROR during toggleDevice for ${deviceId}:`, error.response?.data || error.message);
    throw error.response?.data || new Error(`Failed to toggle device ${deviceId}`);
  }
};

export const registerDeviceApi = async (deviceData) => {
  try {
    const response = await apiClient.post('/api/device/register', deviceData);
    return response.data;
  } catch (error) {
    console.error('Failed to register device:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to register device');
  }
};

export const deleteDeviceApi = async (deviceId) => {
  try {
    const response = await apiClient.delete(`/api/device/${deviceId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to delete device ${deviceId}:`, error.response?.data || error.message);
    throw error.response?.data || new Error(`Failed to delete device ${deviceId}`);
  }
};

// --- Fungsi untuk Pengguna (Users) ---

export const fetchUsers = async () => {
  try {
    const response = await apiClient.get('/api/users');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch users:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to fetch users');
  }
};

// --- Fungsi untuk Log ---

export const fetchAllLogs = async () => {
  try {
    const response = await apiClient.get('/api/logs');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch all logs:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to fetch all logs');
  }
};

// PERBAIKAN: Fungsi baru untuk mengambil log RFID secara spesifik
export const fetchRfidLogs = async () => {
  try {
    // Memanggil endpoint baru atau yang sudah dimodifikasi
    const response = await apiClient.get('/api/logs/rfid'); 
    return response.data;
  } catch (error) {
    console.error('Failed to fetch RFID logs:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to fetch RFID logs');
  }
};


// --- Fungsi untuk RFID (Valid IDs) ---

export const fetchValidRfids = async () => {
  try {
    const response = await apiClient.get('/api/rfid/valid_ids');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch valid RFIDs:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to fetch valid RFIDs');
  }
};

export const addValidRfidApi = async (rfidData) => {
  try {
    const response = await apiClient.post('/api/rfid/valid_ids', rfidData);
    return response.data;
  } catch (error) {
    console.error('Failed to add valid RFID:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to add valid RFID');
  }
};

export const deleteValidRfidApi = async (rfidId) => {
  try {
    const response = await apiClient.delete(`/api/rfid/valid_ids/${rfidId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to delete valid RFID ${rfidId}:`, error.response?.data || error.message);
    throw error.response?.data || new Error(`Failed to delete valid RFID ${rfidId}`);
  }
};