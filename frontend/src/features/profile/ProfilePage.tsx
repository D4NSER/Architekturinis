import { ChangeEvent, FormEvent, useEffect, useState } from 'react';

import { FormField } from '../../components/FormField';
import { updateProfile, uploadAvatar } from '../../api/users';
import { useAuth } from '../auth/AuthContext';


export const ProfilePage = () => {
  const { user, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [goal, setGoal] = useState(user?.goal ?? 'balanced');
  const [heightCm, setHeightCm] = useState(user?.height_cm ? String(user.height_cm) : '');
  const [weightKg, setWeightKg] = useState(user?.weight_kg ? String(user.weight_kg) : '');
  const [activityLevel, setActivityLevel] = useState(user?.activity_level ?? 'moderate');
  const [dietaryPreferences, setDietaryPreferences] = useState(user?.dietary_preferences ?? '');
  const [allergies, setAllergies] = useState(user?.allergies ?? '');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);
  const [isUploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? '');
      setLastName(user.last_name ?? '');
      setGoal(user.goal ?? 'balanced');
      setHeightCm(user.height_cm ? String(user.height_cm) : '');
      setWeightKg(user.weight_kg ? String(user.weight_kg) : '');
      setActivityLevel(user.activity_level ?? 'moderate');
      setDietaryPreferences(user.dietary_preferences ?? '');
      setAllergies(user.allergies ?? '');
    }
  }, [user]);

  if (!user) {
    return <div className="page-loading">Naudotoja informacija pakeliui...</div>;
  }

  const parsePositiveNumber = (value: string): number | null => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  };

  const numericHeight = parsePositiveNumber(heightCm);
  const numericWeight = parsePositiveNumber(weightKg);

  let bmi: number | null = null;
  if (numericHeight && numericWeight) {
    const heightMeters = numericHeight / 100;
    bmi = Number((numericWeight / (heightMeters * heightMeters)).toFixed(1));
  }

  let bmiCategory: string | null = null;
  if (bmi) {
    if (bmi < 18.5) {
      bmiCategory = 'KMI rodo šiek tiek per mažą svorį.';
    } else if (bmi < 25) {
      bmiCategory = 'KMI normoje – palaikykite pasirinktą kryptį!';
    } else if (bmi < 30) {
      bmiCategory = 'KMI rodo perteklinį svorį – planai padės jį subalansuoti.';
    } else {
      bmiCategory = 'KMI rodo nutukimo lygį – rekomenduojame rinktis svorio mažinimo planus ir pasikonsultuoti su specialistu.';
    }
  }

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await updateProfile({
        first_name: firstName,
        last_name: lastName,
        goal,
        height_cm: heightCm ? Number(heightCm) : undefined,
        weight_kg: weightKg ? Number(weightKg) : undefined,
        activity_level: activityLevel,
        dietary_preferences: dietaryPreferences || undefined,
        allergies: allergies || undefined,
      });
      await refreshProfile();
      setStatusMessage('Profilis atnaujintas sėkmingai.');
    } catch (err) {
      setErrorMessage('Nepavyko atnaujinti profilio.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await uploadAvatar(file);
      await refreshProfile();
      setStatusMessage('Profilio nuotrauka atnaujinta.');
    } catch (err) {
      setErrorMessage('Nepavyko įkelti nuotraukos. Patikrinkite failo formatą.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-card">
      <h2>Mano paskyra</h2>
      <p>Tvarkykite profilio duomenis ir tikslus, kad gautumėte jums tinkamiausius planus.</p>
      {statusMessage && <div className="success-banner">{statusMessage}</div>}
      {errorMessage && <div className="error-banner">{errorMessage}</div>}

      <section className="grid" style={{ gap: 24 }}>
        <div>
          <h3>Pagrindinė informacija</h3>
          {bmi && (
            <div className="plan-card" style={{ padding: 16, marginBottom: 16 }}>
              <strong>KMI: {bmi}</strong>
              {bmiCategory && <p style={{ margin: '8px 0 0' }}>{bmiCategory}</p>}
            </div>
          )}
          <form onSubmit={handleProfileSubmit} className="grid" style={{ gap: 16, maxWidth: 460 }}>
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
                min={100}
                max={250}
              />
              <FormField
                id="weight_kg"
                label="Svoris (kg)"
                type="number"
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
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
            />
            <FormField
              id="allergies"
              label="Alergijos / produktai, kurių vengiate"
              as="textarea"
              value={allergies}
              onChange={(event) => setAllergies(event.target.value)}
            />
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saugoma...' : 'Išsaugoti'}
            </button>
          </form>
        </div>

        <div>
          <h3>Profilio nuotrauka</h3>
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt="Profilio nuotrauka"
              className="avatar-preview"
              width={96}
              height={96}
            />
          ) : (
            <div
              className="avatar-preview"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#e6edf7',
                color: '#314d5f',
                fontWeight: 600,
              }}
            >
              {user.first_name?.[0] ?? user.email[0]}
            </div>
          )}
          <p>Įkelkite PNG arba JPG formatą.</p>
          <label className="secondary-button" style={{ display: 'inline-block', cursor: 'pointer' }}>
            {isUploading ? 'Įkeliama...' : 'Pasirinkti nuotrauką'}
            <input type="file" accept="image/png,image/jpeg" onChange={handleAvatarUpload} hidden />
          </label>
        </div>
      </section>
    </div>
  );
};

export default ProfilePage;
