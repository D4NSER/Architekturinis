import { createContext, ReactNode, useEffect, useMemo, useState } from "react";

import { fetchCurrentUser, loginRequest, registerRequest } from "../api/client";
import type { User } from "../api/types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface Props {
  children: ReactNode;
}

export const AuthProvider = ({ children }: Props) => {
  const [token, setToken] = useState<string | null>(() => window.localStorage.getItem("apss_token"));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initialize = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const userResponse = await fetchCurrentUser();
        setUser(userResponse);
      } catch (error) {
        console.error("Failed to load user", error);
        window.localStorage.removeItem("apss_token");
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    void initialize();
  }, [token]);

  const login = async (username: string, password: string) => {
    const { access_token } = await loginRequest(username, password);
    window.localStorage.setItem("apss_token", access_token);
    setToken(access_token);
    const userResponse = await fetchCurrentUser();
    setUser(userResponse);
  };

  const register = async (username: string, email: string, password: string) => {
    await registerRequest(username, email, password);
    await login(username, password);
  };

  const logout = () => {
    window.localStorage.removeItem("apss_token");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};