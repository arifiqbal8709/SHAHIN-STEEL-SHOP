import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('shahin_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('shahin_auth_token') || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('shahin_auth_token', token);
    } else {
      localStorage.removeItem('shahin_auth_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('shahin_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('shahin_user');
    }
  }, [user]);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await authAPI.login({
        username,
        password,
        device_info: `${navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop / Laptop'} (${window.innerWidth}x${window.innerHeight})`
      });

      if (res.success) {
        setUser(res.user);
        setToken(res.token);
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message || 'Login failed.' };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message || 'Authentication error.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('shahin_auth_token');
    localStorage.removeItem('shahin_user');
  };

  // STRICT: Admin is one! Only OWNER role has admin/owner privileges
  const isOwner = () => user?.role === 'OWNER';
  const isAccountant = () => user?.role === 'ACCOUNTANT';
  const isEmployee = () => user?.role === 'EMPLOYEE' || (Boolean(user) && user?.role !== 'OWNER');

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      logout,
      isOwner,
      isAccountant,
      isEmployee
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

