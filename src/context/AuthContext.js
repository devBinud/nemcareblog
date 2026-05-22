import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const AUTH_URL = 'https://api.nemcare.com/api/auth/login';

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setIsLoggedIn(true);
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setError('');
    try {
      const res = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.message || 'Invalid email or password.');
        return;
      }

      // Store token — handle both { token } and { data: { token } }
      const token = json.token || json.data?.token || json.accessToken;
      if (token) {
        localStorage.setItem('token', token);
        setIsLoggedIn(true);
      } else {
        setError('Login failed. No token received.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to connect to server. Please try again.');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout, error, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
