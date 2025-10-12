import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { FormField } from '../../components/FormField';
import { useAuth } from './AuthContext';

export const RegisterPage = () => {
  const { register, error } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [goals, setGoals] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        goals,
      });
      navigate('/plans');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-card" style={{ maxWidth: 520 }}>
      <h2>Sukurti paskyrą</h2>
      <p>Užpildykite asmeninę informaciją, kad galėtume pritaikyti mitybos planus jūsų tikslams.</p>
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
          autoComplete="new-password"
          required
        />
        <FormField
          id="first_name"
          label="Vardas"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          autoComplete="given-name"
        />
        <FormField
          id="last_name"
          label="Pavardė"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          autoComplete="family-name"
        />
        <FormField
          id="goals"
          label="Mitybos tikslai"
          value={goals}
          as="textarea"
          onChange={(event) => setGoals(event.target.value)}
          placeholder="Pvz.: svorio mažinimas, raumenų auginimas, subalansuota mityba"
        />
        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? 'Kuriama...' : 'Registruotis'}
        </button>
      </form>
      <p>
        Jau turite paskyrą?{' '}
        <Link to="/login" className="inline-link">
          Prisijunkite
        </Link>
      </p>
    </div>
  );
};

export default RegisterPage;
