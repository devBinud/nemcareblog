const BASE_URL = process.env.REACT_APP_API_URL || 'https://api.nemcare.com/api';

const getToken = () => localStorage.getItem('token');

const handleUnauthorized = (res) => {
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
};

// For JSON requests (GET, DELETE)
export const apiFetch = async (endpoint, options = {}) => {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  handleUnauthorized(res);
  return res;
};

// For FormData requests (POST, PUT with files)
export const apiFormFetch = async (endpoint, options = {}) => {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
      // Do NOT set Content-Type for FormData — browser sets it with boundary
    },
  });
  handleUnauthorized(res);
  return res;
};
