import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const configuredBaseUrl = BASE_URL.replace(/\/+$/, '');
const API_BASE_URL = configuredBaseUrl.endsWith('/api') ? configuredBaseUrl : `${configuredBaseUrl}/api`;
const customerClient = axios.create({ baseURL: API_BASE_URL });

customerClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartserve_customer_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default customerClient;
