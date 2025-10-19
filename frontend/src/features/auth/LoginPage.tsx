import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { FormField } from '../../components/FormField';
import { useAuth } from './AuthContext';

export const LoginPage = () => {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/plans';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="page-card" style={{ maxWidth: 480 }}>
        <h2>Prisijungimas</h2>
        <p>Įveskite savo prisijungimo duomenis norėdami matyti asmeninę informaciją.</p>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit} className="grid" style={{ gap: 16 }}>
          <FormField
            id="email"
            label="El. paštas"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          <FormField
            id="password"
            label="Slaptažodis"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Jungiama...' : 'Prisijungti'}
          </button>
        </form>
        <p>
          Neturite paskyros?{' '}
          <Link to="/register" className="inline-link">
            Sukurti paskyrą
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
