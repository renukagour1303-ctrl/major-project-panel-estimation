import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, fetchCurrentUser } from '../services/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('sungroves_auth_token') || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('sungroves_auth_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
      if (!token) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const res = await fetchCurrentUser(token);
        if (isMounted && res.success && res.user) {
          setUser(res.user);
          localStorage.setItem('sungroves_auth_user', JSON.stringify(res.user));
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Session verification failed, logging out:', err);
        logout();
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    verifySession();
    return () => { isMounted = false; };
  }, [token]);

  const login = async (username, password) => {
    const res = await loginUser(username, password);
    if (res.success && res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      try {
        localStorage.setItem('sungroves_auth_token', res.token);
        localStorage.setItem('sungroves_auth_user', JSON.stringify(res.user));
      } catch (err) {
        console.error('Failed to save auth to localStorage:', err);
      }
      return res;
    }
    throw new Error(res.message || 'Login failed.');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem('sungroves_auth_token');
      localStorage.removeItem('sungroves_auth_user');
    } catch (err) {
      console.error('Failed to clear auth storage:', err);
    }
  };

  const updateUser = (updatedData) => {
    setUser(prev => {
      const merged = { ...(prev || {}), ...updatedData };
      try {
        localStorage.setItem('sungroves_auth_user', JSON.stringify(merged));
      } catch (err) {
        console.error('Failed to update user in localStorage:', err);
      }
      return merged;
    });
  };

  const userRole = (user?.role || '').toUpperCase();
  const isAuthenticated = Boolean(token && user);
  const isAdmin = Boolean(isAuthenticated && userRole === 'ADMIN');
  const isStaff = Boolean(isAuthenticated && (userRole === 'STAFF' || userRole === 'ADMIN'));

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        isAuthenticated,
        isAdmin,
        isStaff,
        login,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
