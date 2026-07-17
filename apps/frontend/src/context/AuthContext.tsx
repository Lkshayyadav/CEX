import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isLoggedIn: boolean;
  login: (token: string, userData: AuthUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get<{ success: boolean; data: AuthUser }>('/auth/me');
      if (response.data && response.data.success) {
        setUser(response.data.data);
      } else {
        // Fallback in case of unexpected format
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user profiles:', error);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = (token: string, userData: AuthUser) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const refreshUser = async () => {
    setLoading(true);
    await fetchCurrentUser();
  };

  const value: AuthContextType = {
    user,
    loading,
    isLoggedIn: !!user,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
