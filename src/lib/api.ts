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
    console.error(`❌ [API Error] ${status || 'Network'} ${error.config?.url}: ${message}`);

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
