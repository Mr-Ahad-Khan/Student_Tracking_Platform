import { useState, useEffect } from 'react';
import api from '../utils/api.js';
import { AuthContext } from './AuthContextValue.js';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check login status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get('/auth/me');
        if (response.data?.user) {
          setUser(response.data.user);
        }
    } catch {
      console.log('Session check: No active session active or backend unreachable.');
      setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data?.user) {
        setUser(response.data.user);
      }
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      const errMsg = err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'Login failed. Please check your credentials.';
      setError(errMsg);
      throw new Error(errMsg, { cause: err });
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err.message);
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data?.user) {
        setUser(response.data.user);
      }
    } catch (err) {
      console.error('Refresh user error:', err.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
