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
  const [goal, setGoal] = useState('balanced');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [dietaryPreferences, setDietaryPreferences] = useState('');
  const [allergies, setAllergies] = useState('');
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
        goal,
        height_cm: heightCm ? Number(heightCm) : undefined,
        weight_kg: weightKg ? Number(weightKg) : undefined,
        activity_level: activityLevel,
        dietary_preferences: dietaryPreferences || undefined,
        allergies: allergies || undefined,
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
          id="goal"
          label="Mitybos tikslas"
          as="select"
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          options={[
            { value: 'weight_loss', label: 'Svorio mažinimas' },
            { value: 'muscle_gain', label: 'Raumenų auginimas' },
            { value: 'balanced', label: 'Subalansuota mityba' },
            { value: 'vegetarian', label: 'Vegetariškas gyvenimo būdas' },
            { value: 'performance', label: 'Didelis fizinis krūvis / sportas' },
          ]}
        />
        <div className="grid" style={{ gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <FormField
            id="height_cm"
            label="Ūgis (cm)"
            type="number"
            value={heightCm}
            onChange={(event) => setHeightCm(event.target.value)}
            placeholder="175"
            min={100}
            max={250}
          />
          <FormField
            id="weight_kg"
            label="Svoris (kg)"
            type="number"
            value={weightKg}
            onChange={(event) => setWeightKg(event.target.value)}
            placeholder="72"
            min={35}
            max={250}
          />
        </div>
        <FormField
          id="activity_level"
          label="Aktyvumo lygis"
          as="select"
          value={activityLevel}
          onChange={(event) => setActivityLevel(event.target.value)}
          options={[
            { value: 'sedentary', label: 'Sėslus (daug sėdimo darbo)' },
            { value: 'light', label: 'Lengvas aktyvumas (1–2 treniruotės per savaitę)' },
            { value: 'moderate', label: 'Vidutinis aktyvumas (3–4 treniruotės per savaitę)' },
            { value: 'active', label: 'Aktyvus (5+ treniruotės, daug judėjimo)' },
            { value: 'athlete', label: 'Sportininkas / aukštas krūvis' },
          ]}
        />
        <FormField
          id="dietary_preferences"
          label="Pageidaujami mitybos tipai"
          as="textarea"
          value={dietaryPreferences}
          onChange={(event) => setDietaryPreferences(event.target.value)}
          placeholder="Pvz.: vegetariška, be laktozės, jūros gėrybės tik kartą per savaitę"
        />
        <FormField
          id="allergies"
          label="Alergijos / produktai, kurių vengi"
          as="textarea"
          value={allergies}
          onChange={(event) => setAllergies(event.target.value)}
          placeholder="Pvz.: riešutai, glitimas"
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
