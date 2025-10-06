import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useEffect, useMemo, useState } from "react";
import { fetchCurrentUser, loginRequest, registerRequest } from "../api/client";
export const AuthContext = createContext(undefined);
export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => window.localStorage.getItem("apss_token"));
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const initialize = async () => {
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const userResponse = await fetchCurrentUser();
                setUser(userResponse);
            }
            catch (error) {
                console.error("Failed to load user", error);
                window.localStorage.removeItem("apss_token");
                setToken(null);
            }
            finally {
                setLoading(false);
            }
        };
        void initialize();
    }, [token]);
    const login = async (username, password) => {
        const { access_token } = await loginRequest(username, password);
        window.localStorage.setItem("apss_token", access_token);
        setToken(access_token);
        const userResponse = await fetchCurrentUser();
        setUser(userResponse);
    };
    const register = async (username, email, password) => {
        await registerRequest(username, email, password);
        await login(username, password);
    };
    const logout = () => {
        window.localStorage.removeItem("apss_token");
        setToken(null);
        setUser(null);
    };
    const value = useMemo(() => ({ user, token, loading, login, register, logout }), [user, token, loading]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
};