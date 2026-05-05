import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Logger ───────────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  console.log(`🚀 [API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
  return config;
});

// ─── Response Logger ──────────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    console.log(`✅ [API Success] ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();

    // Expected business errors (4xx) — log once as a warning, not an error
    if (status && status >= 400 && status < 500) {
      console.warn(`⚠ [API ${status}] ${method} ${url}: ${message}`);
    } else if (error.response) {
      // Unexpected server errors (5xx)
      console.error(`❌ [API ${status}] ${method} ${url}: ${message}`);
      console.error('Response:', error.response.data);
    } else if (error.request) {
      // Network errors — no response at all
      const fullUrl = `${error.config?.baseURL || ''}${url}`;
      console.error(`❌ [Network Error] ${method} ${fullUrl}: No response received. Check if backend is running and reachable.`);
      console.error('Request Details:', error.request);
    } else {
      console.error('❌ [Request Setup Error]:', error.message);
    }

    if (status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('crm_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
