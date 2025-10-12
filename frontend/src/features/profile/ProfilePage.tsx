import { ChangeEvent, FormEvent, useEffect, useState } from 'react';

import { FormField } from '../../components/FormField';
import { updateProfile, uploadAvatar } from '../../api/users';
import { useAuth } from '../auth/AuthContext';

export const ProfilePage = () => {
  const { user, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [goals, setGoals] = useState(user?.goals ?? '');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);
  const [isUploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? '');
      setLastName(user.last_name ?? '');
      setGoals(user.goals ?? '');
    }
  }, [user]);

  if (!user) {
    return <div className="page-loading">Naudotoja informacija pakeliui...</div>;
  }

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await updateProfile({ first_name: firstName, last_name: lastName, goals });
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
              id="goals"
              label="Mitybos tikslai"
              value={goals}
              as="textarea"
              onChange={(event) => setGoals(event.target.value)}
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
