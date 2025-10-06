import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
const LoginPage = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await login(username, password);
            const from = location.state?.from?.pathname ?? "/";
            navigate(from, { replace: true });
        }
        catch (err) {
            console.error(err);
            setError("Invalid username or password");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("section", { className: "page", children: _jsxs("div", { className: "auth-card", children: [_jsx("h2", { children: "Login" }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("label", { children: ["Username", _jsx("input", { value: username, onChange: (event) => setUsername(event.target.value), required: true })] }), _jsxs("label", { children: ["Password", _jsx("input", { type: "password", value: password, onChange: (event) => setPassword(event.target.value), required: true })] }), error && _jsx("p", { className: "error", children: error }), _jsx("button", { className: "button-primary", type: "submit", disabled: loading, children: loading ? "Signing in..." : "Login" })] }), _jsxs("p", { children: ["Need an account? ", _jsx(Link, { to: "/register", children: "Register" })] })] }) }));
};
export default LoginPage;
