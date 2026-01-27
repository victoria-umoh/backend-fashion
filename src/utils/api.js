import axios from 'axios';

// Create axios instance with base URL from environment variable
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || process.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests
});

// Add request interceptor to include auth token
API.interceptors.request.use(
  (config) => {
    const userInfo = localStorage.getItem('userInfo') 
      ? JSON.parse(localStorage.getItem('userInfo')) 
      : null;
    
    if (userInfo && userInfo.token) {
      config.headers.Authorization = `Bearer ${userInfo.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    console.error('API Error:', message);
    
    // Handle unauthorized errors
    if (error.response?.status === 401) {
      localStorage.removeItem('userInfo');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default API;
