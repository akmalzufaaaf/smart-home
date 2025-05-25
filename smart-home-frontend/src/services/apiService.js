// src/services/apiService.js
import axios from 'axios';
import { API_BASE_URL, MQTT_BROKER_URL /*, konstanta lainnya */ } from '../config/contants.js'; 

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Fungsi untuk menambahkan token ke header
const getToken = () => localStorage.getItem('accessToken');

apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const loginUser = async (credentials) => {
  try {
    const response = await apiClient.post('/login', credentials);
    if (response.data.access_token) {
      localStorage.setItem('accessToken', response.data.access_token);
      // Kamu mungkin juga ingin menyimpan refresh_token jika backend mengirimnya
      // localStorage.setItem('refreshToken', response.data.refresh_token);
    }
    return response.data;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error.response?.data || new Error('Login failed');
  }
};

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
  // action harus "ON" atau "OFF" (sesuaikan dengan backend)
  try {
    const response = await apiClient.post(`/api/device/${deviceId}/toggle`, { action });
    return response.data;
  } catch (error) {
    console.error(`Failed to toggle device ${deviceId}:`, error.response?.data || error.message);
    throw error.response?.data || new Error(`Failed to toggle device ${deviceId}`);
  }
};

export const logoutUser = () => {
    localStorage.removeItem('accessToken');
    // localStorage.removeItem('refreshToken');
    // Tidak ada endpoint /logout di backendmu, jadi ini hanya lokal
};