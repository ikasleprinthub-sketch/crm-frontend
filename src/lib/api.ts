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

    console.error(`❌ [API Error] ${status || 'Network'} ${method} ${url}: ${message}`);
    
    if (error.response) {
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received. The request was made but no response was received from the server.');
    } else {
      console.error('Error setting up the request:', error.message);
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
