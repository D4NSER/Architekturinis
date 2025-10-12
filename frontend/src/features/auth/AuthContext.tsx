import axios from 'axios';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { setAuthToken } from '../../api/client';
import { loginUser, registerUser } from '../../api/auth';
import type { RegisterPayload } from '../../api/auth';
import { fetchCurrentUser } from '../../api/users';
import type { LoginResponse, UserProfile } from '../../types';

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'fitbite_token';

const storeToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

const getStoredToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setTokenState] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!token);
  const [error, setError] = useState<string | null>(null);

  const setToken = useCallback((value: string | null) => {
    setTokenState(value);
    setAuthToken(value);
    storeToken(value);
  }, []);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await fetchCurrentUser();
      setUser(profile);
    } catch (err) {
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [setToken]);

  useEffect(() => {
    setAuthToken(token);
    if (token) {
      fetchProfile();
    }
  }, [token, fetchProfile]);

  const handleAuthSuccess = useCallback(async (response: LoginResponse) => {
    setToken(response.access_token);
    await fetchProfile();
  }, [fetchProfile, setToken]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const response = await loginUser({ email, password });
      await handleAuthSuccess(response);
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? (err.response.data.detail as string)
          : 'Nepavyko prisijungti. Patikrinkite duomenis ir bandykite dar kartą.';
      setError(message);
      throw err;
    }
  }, [handleAuthSuccess]);

  const register = useCallback(async (payload: RegisterPayload) => {
    setError(null);
    try {
      await registerUser(payload);
      const response = await loginUser({ email: payload.email, password: payload.password });
      await handleAuthSuccess(response);
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? (err.response.data.detail as string)
          : 'Nepavyko sukurti paskyros. Bandykite dar kartą.';
      setError(message);
      throw err;
    }
  }, [handleAuthSuccess]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, [setToken]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshProfile,
  }), [error, isLoading, login, logout, refreshProfile, register, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
