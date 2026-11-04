import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../../config/api';

export interface User {
  id: string;
  fullName: string;
  email: string;
  mfaEnabled: boolean;
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string, otpToken?: string) => Promise<{ mfaRequired: boolean }>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  getMfaSetup: () => Promise<{ secret: string; qrCodeUrl: string }>;
  enableMfa: (code: string) => Promise<void>;
  disableMfa: () => Promise<void>;
  updateUserMfaStatus: (enabled: boolean) => void;
  updateProfile: (patch: { fullName?: string; avatarUrl?: string | null }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load persisted session on initial mount
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, otpToken?: string) => {
    const response = await api.post('/auth/login', { email, password, otpToken });
    const { token: jwt, refreshToken, mfaRequired, user: userData } = response.data;

    if (mfaRequired) {
      return { mfaRequired: true };
    }

    localStorage.setItem('token', jwt);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));

    setToken(jwt);
    setUser(userData);

    return { mfaRequired: false };
  };

  const register = async (fullName: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { fullName, email, password });
    const { token: jwt, refreshToken, user: userData } = response.data;

    localStorage.setItem('token', jwt);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));

    setToken(jwt);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const getMfaSetup = async () => {
    const response = await api.get('/auth/mfa/setup');
    return response.data;
  };

  const enableMfa = async (code: string) => {
    await api.post('/auth/mfa/enable', { code });
    if (user) {
      const updatedUser = { ...user, mfaEnabled: true };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  const disableMfa = async () => {
    await api.post('/auth/mfa/disable');
    if (user) {
      const updatedUser = { ...user, mfaEnabled: false };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  const updateUserMfaStatus = (enabled: boolean) => {
    if (user) {
      const updatedUser = { ...user, mfaEnabled: enabled };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  const updateProfile = async (patch: { fullName?: string; avatarUrl?: string | null }) => {
    const response = await api.put('/auth/profile', patch);
    localStorage.setItem('user', JSON.stringify(response.data));
    setUser(response.data);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await api.put('/auth/password', { currentPassword, newPassword });
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        getMfaSetup,
        enableMfa,
        disableMfa,
        updateUserMfaStatus,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
