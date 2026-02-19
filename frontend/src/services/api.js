import axios from 'axios';
import { toast } from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to get auth token
const getAuthToken = () => {
  try {
    const storageItem = localStorage.getItem('auth-storage');
    if (storageItem) {
      const { state } = JSON.parse(storageItem);
      return state?.token;
    }
  } catch (e) {
    console.error('Error parsing auth storage', e);
  }
  return null;
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Standardize Error Message
    if (error.response?.data) {
      const backendError = error.response.data;
      error.message = backendError.message || error.message;
      error.code = backendError.code || error.code;
      // If validation errors exist, append them
      if (backendError.errors) {
         error.message += ': ' + backendError.errors.map(e => e.message).join(', ');
      }
    }

    // Network Error or Server Error (5xx)
    if (!error.response) {
      toast.error('Network Error: Please check your connection.');
    } else if (error.response.status >= 500) {
      toast.error(`Server Error: ${error.message || 'Something went wrong on the backend.'}`);
    } else if (error.response.status !== 401) {
       // Toast other errors (400, 403, 404) unless it's 401 which is handled by refresh logic
       toast.error(error.message || 'An unexpected error occurred');
    }

    // Handle 401 & Token Refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/refresh') &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/employee-login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storageItem = localStorage.getItem('auth-storage');
        const { state } = JSON.parse(storageItem || '{}');
        const refreshToken = state?.refreshToken;

        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
          { refreshToken },
        );

        const newToken = res.data.token;

        // Update stored token atomically
        const current = JSON.parse(localStorage.getItem('auth-storage') || '{}');
        if (current.state) {
          current.state.token = newToken;
          if (res.data.user) current.state.user = res.data.user;
          localStorage.setItem('auth-storage', JSON.stringify(current));
        }

        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
        toast.error('Session expired. Please login again.');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
