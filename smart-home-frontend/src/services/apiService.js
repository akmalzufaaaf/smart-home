// src/services/apiService.js
import axios from 'axios';
import { API_BASE_URL } from '../config/contants.js';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getAccessToken = () => localStorage.getItem('accessToken');
const getRefreshToken = () => localStorage.getItem('refreshToken');

// src/services/apiService.js
// ... (axios initialization, getAccessToken, getRefreshToken) ...

const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem('accessToken', accessToken);
  if (refreshToken) { // Pastikan refreshToken ada sebelum disimpan
    localStorage.setItem('refreshToken', refreshToken); // SIMPAN REFRESH TOKEN
    console.log("Refresh token saved to localStorage:", refreshToken); // Tambahkan log ini
  } else {
    console.warn("No refresh token received during login to save.");
  }
};

export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken'); // Pastikan refresh token juga dihapus saat logout
};

export const loginUser = async (credentials) => {
  try {
    const response = await apiClient.post('/login', credentials);
    console.log("Login response data:", response.data); // Log respons login
    if (response.data.access_token && response.data.refresh_token) {
      setTokens(response.data.access_token, response.data.refresh_token);
      console.log("Login successful, tokens saved.");
    } else if (response.data.access_token) {
      setTokens(response.data.access_token, null);
      console.warn("Login successful, but no refresh token received from backend.");
    } else {
      throw new Error('No access_token received from login');
    }
    return response.data;
  } catch (error) { /* ... */ }
};

// Fungsi untuk refresh token
const refreshToken = async () => {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    console.log('No refresh token available.');
    return Promise.reject(new Error('No refresh token'));
  }
  try {
    // Penting: Saat memanggil /refresh, header Authorization harus berisi REFRESH TOKEN
    const response = await apiClient.post('/refresh', {}, { // Body bisa kosong jika tidak diperlukan
      headers: {
        Authorization: `Bearer ${currentRefreshToken}`
      }
    });
    
    const { access_token } = response.data;
    if (access_token) {
      localStorage.setItem('accessToken', access_token); // Simpan access token baru
      console.log('Token refreshed successfully.');
      return access_token;
    } else {
      throw new Error('No new access token received from refresh endpoint');
    }
  } catch (error) {
    console.error('Failed to refresh token:', error.response?.data || error.message);
    clearTokens(); // Hapus token jika refresh gagal
    // Arahkan ke login atau panggil onLogout callback jika ada
    window.dispatchEvent(new Event('auth-error-logout')); // Cara sederhana untuk trigger logout global
    throw error;
  }
};

// Interceptor untuk request
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    // Jangan tambahkan access token ke header untuk request /refresh
    // karena /refresh memerlukan refresh token di header-nya
    if (token && config.url !== '/refresh') { 
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor untuk response (menangani token refresh)
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Jika error 401 dan bukan dari request /refresh itu sendiri, dan belum ada proses refresh
    if (error.response?.status === 401 && originalRequest.url !== '/refresh' && !isRefreshing) {
      console.log('Access token expired or invalid, attempting to refresh...');
      isRefreshing = true;
      try {
        const newAccessToken = await refreshToken();
        isRefreshing = false;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken); // Proses antrian request yang gagal dengan token baru
        return apiClient(originalRequest); // Ulangi request asli dengan token baru
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null); // Proses antrian request dengan error refresh
        // Logout atau tindakan lain bisa ditangani oleh refreshToken atau event 'auth-error-logout'
        return Promise.reject(refreshError);
      }
    }

    // Jika sedang dalam proses refresh, tambahkan request ke antrian
    if (isRefreshing && originalRequest.url !== '/refresh') {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      }).catch(err => {
        return Promise.reject(err);
      });
    }

    return Promise.reject(error);
  }
);


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
    const response = await apiClient.post(`/api/device/${deviceId}/toggle`, { action });
    return response.data;
  } catch (error) {
    console.error(`Failed to toggle device ${deviceId}:`, error.response?.data || error.message);
    throw error.response?.data || new Error(`Failed to toggle device ${deviceId}`);
  }
};

export const logoutUser = () => {
    clearTokens();
    // Tambahkan logika lain jika perlu, misalnya mengarahkan ke halaman login
};

// src/services/apiService.js
// ... (kode yang sudah ada) ...

export const fetchUsers = async () => {
  try {
    const response = await apiClient.get('/api/users'); // Endpoint baru
    return response.data;
  } catch (error) {
    console.error('Failed to fetch users:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to fetch users');
  }
};

export const fetchLogs = async () => { // Fungsi untuk mengambil semua log
  try {
    const response = await apiClient.get('/api/logs');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch logs:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to fetch logs');
  }
};