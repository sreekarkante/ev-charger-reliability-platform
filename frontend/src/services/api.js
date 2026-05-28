const API_URL = '/api';

/**
 * Attaches the JWT token to requests if present.
 */
const getHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Simple fetch-based API client for lightweight browser execution
const api = {
  get: async (endpoint) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'API request failed');
    return data;
  },

  post: async (endpoint, body) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'API request failed');
    return data;
  },

  put: async (endpoint, body) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'API request failed');
    return data;
  },

  delete: async (endpoint) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'API request failed');
    return data;
  }
};

// Modular helper endpoints
export const authService = {
  register: (name, email, password) => api.post('/auth/register', { name, email, password }),
  login: (email, password) => api.post('/auth/login', { email, password }),
  getProfile: () => api.get('/auth/profile'),
};

export const stationService = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.charger_type) params.append('charger_type', filters.charger_type);
    if (filters.connector_type) params.append('connector_type', filters.connector_type);
    if (filters.user_lat) params.append('user_lat', filters.user_lat);
    if (filters.user_lng) params.append('user_lng', filters.user_lng);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return api.get(`/stations${queryString}`);
  },
  getById: (id) => api.get(`/stations/${id}`),
  create: (stationData) => api.post('/stations', stationData),
  update: (id, stationData) => api.put(`/stations/${id}`, stationData),
  delete: (id) => api.delete(`/stations/${id}`),
};

export const reportService = {
  submit: (reportData) => api.post('/reports', reportData),
  getByStation: (stationId) => api.get(`/reports/station/${stationId}`),
  getByUser: (userId) => api.get(`/reports/user/${userId}`),
};

export const adminService = {
  getSystemStats: () => api.get('/analytics/system'),
  getStationStats: () => api.get('/analytics/stations'),
  getUserStats: () => api.get('/analytics/users'),
  updateUserStatus: (userId, status, cooldownHours) => api.put(`/analytics/users/${userId}/status`, { status, cooldownHours }),
};

export default api;
