import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { FormField } from '../../components/FormField';
import { updateProfile, uploadAvatar } from '../../api/users';
import { cancelPurchase, downloadPurchaseReceipt, fetchPurchases } from '../../api/purchases';
import { useAuth } from '../auth/AuthContext';
import type {
  AllergenId,
  PurchaseSummary,
  PlanProgressSurvey as PlanProgressSurveyType,
  PlanSurveyHistoryEntry,
  SurveyAnswerSummary,
} from '../../types';
import { AllergenBadgeList } from '../../components/AllergenBadgeList';
import { ALLERGEN_OPTIONS } from '../../constants/allergens';

const MONTH_OPTIONS = [
  { value: '01', label: 'Sausis' },
  { value: '02', label: 'Vasaris' },
  { value: '03', label: 'Kovas' },
  { value: '04', label: 'Balandis' },
  { value: '05', label: 'Gegužė' },
  { value: '06', label: 'Birželis' },
  { value: '07', label: 'Liepa' },
  { value: '08', label: 'Rugpjūtis' },
  { value: '09', label: 'Rugsėjis' },
  { value: '10', label: 'Spalis' },
  { value: '11', label: 'Lapkritis' },
  { value: '12', label: 'Gruodis' },
];

export const ProfilePage = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [goal, setGoal] = useState(user?.goal ?? 'balanced');
  const [heightCm, setHeightCm] = useState(user?.height_cm ? String(user.height_cm) : '');
  const [weightKg, setWeightKg] = useState(user?.weight_kg ? String(user.weight_kg) : '');
  const [activityLevel, setActivityLevel] = useState(user?.activity_level ?? 'moderate');
  const [dietaryPreferences, setDietaryPreferences] = useState(user?.dietary_preferences ?? '');
  const [allergies, setAllergies] = useState<AllergenId[]>(user?.allergies ?? []);
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const [purchases, setPurchases] = useState<PurchaseSummary[]>([]);
  const [isLoadingPurchases, setLoadingPurchases] = useState(true);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  const handleAllergyChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(event.target.selectedOptions, (option) => option.value as AllergenId);
    setAllergies(values);
  };

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: string[] = [];
    for (let year = currentYear; year >= 1900; year -= 1) {
      years.push(String(year));
    }
    return years;
  }, []);

  const daysInSelectedMonth = useMemo(() => {
    if (!birthYear || !birthMonth) {
      return 31;
    }
    return new Date(Number(birthYear), Number(birthMonth), 0).getDate();
  }, [birthYear, birthMonth]);

  const dayOptions = useMemo(
    () => Array.from({ length: daysInSelectedMonth }, (_, index) => String(index + 1).padStart(2, '0')),
    [daysInSelectedMonth],
  );

  const planProgress = user?.plan_progress ?? null;
  const planSurveys = (user?.plan_surveys ?? []) as PlanProgressSurveyType[];
  const completedSurveys = (user?.plan_completed_surveys ?? []) as PlanSurveyHistoryEntry[];
  const sortedPlanSurveys = useMemo(
    () => planSurveys.slice().sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()),
    [planSurveys],
  );
  const sortedCompletedSurveys = useMemo(
    () =>
      completedSurveys
        .slice()
        .sort((a, b) => {
          const getTime = (survey: PlanSurveyHistoryEntry) => {
            const fallback = survey.submitted_at ?? survey.completed_at ?? survey.scheduled_at;
            return fallback ? new Date(fallback).getTime() : 0;
          };
          return getTime(b) - getTime(a);
        }),
    [completedSurveys],
  );
  const planName = planProgress?.plan_name ?? sortedPlanSurveys[0]?.plan_name_snapshot ?? null;
  const planIdForNavigation = planProgress?.plan_id ?? sortedPlanSurveys[0]?.plan_id ?? null;
  const progressPercent = useMemo(() => {
    if (!planProgress) return 0;
    const percent = Math.round((planProgress.percent ?? 0) * 100);
    return Math.min(Math.max(percent, 0), 100);
  }, [planProgress]);

  const progressStatus = useMemo(() => {
    if (!planProgress) return null;
    if (planProgress.is_expired || planProgress.remaining_days <= 0) {
      return 'Planas baigtas! Sveikiname pasiekus tikslą.';
    }
    if (planProgress.remaining_days === planProgress.total_days) {
      return 'Planas ką tik pradėtas – tęskite ritmą!';
    }
    return `Liko ${planProgress.remaining_days} d. iki tikslo pasiekimo.`;
  }, [planProgress]);

  const formattedStart = useMemo(() => {
    if (!planProgress) return null;
    return new Date(planProgress.started_at).toLocaleDateString('lt-LT');
  }, [planProgress]);

  const formattedFinish = useMemo(() => {
    if (!planProgress) return null;
    return new Date(planProgress.expected_finish_at).toLocaleDateString('lt-LT');
  }, [planProgress]);

  const progressBarColor = planProgress && planProgress.is_expired ? '#16a34a' : '#2563eb';

  const surveyStatusLabel = (survey: PlanProgressSurveyType) => {
    if (survey.response_submitted || survey.status === 'completed') {
      return 'Apklausa užpildyta';
    }
    switch (survey.status) {
      case 'cancelled':
        return 'Apklausa bus aktyvuota vėliau';
      default:
        return 'Apklausa laukia atsakymo';
    }
  };

  const surveyStatusClass = (survey: PlanProgressSurveyType) => {
    if (survey.response_submitted || survey.status === 'completed') {
      return 'survey-status--completed';
    }
    switch (survey.status) {
      case 'cancelled':
        return 'survey-status--cancelled';
      default:
        return 'survey-status--pending';
    }
  };

  const surveyTitle = (survey: PlanProgressSurveyType) => {
    if (survey.survey_type === 'final') {
      return 'Galutinė apklausa';
    }
    return `Progreso apklausa (po ${survey.day_offset} dienų)`;
  };

  const handleSurveyClick = (survey: PlanProgressSurveyType) => {
    // Open the survey in read-only viewer from profile
    navigate(`/surveys/${survey.id}?view=readonly`, { state: { readOnlyFromProfile: true } });
  };

  const renderSurveyList = () => {
    if (sortedPlanSurveys.length === 0) return null;
    return (
      <div className="profile-plan-surveys">
        <h3>Planuotos apklausos</h3>
        <ul>
          {sortedPlanSurveys.map((survey) => (
            <li key={survey.id} className="profile-survey-row" onClick={() => handleSurveyClick(survey)}>
              <div>
                <strong>{new Date(survey.scheduled_at).toLocaleDateString('lt-LT')}</strong>
                <span className="profile-survey-row__plan">{survey.plan_name_snapshot}</span>
              </div>
              <div className="profile-survey-row__meta">
                <span className={`survey-status ${surveyStatusClass(survey)}`}>{surveyStatusLabel(survey)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const historySurveyTitle = (survey: PlanSurveyHistoryEntry) => {
    if (survey.survey_type === 'final') {
      return 'Galutinė apklausa';
    }
    return `Progreso apklausa (po ${survey.day_offset} dienų)`;
  };

  const formatHistoryAnswer = (answer: SurveyAnswerSummary['answer']) => {
    if (Array.isArray(answer)) {
      return answer.length ? answer.join(', ') : '—';
    }
    if (answer === null || answer === undefined || `${answer}`.trim() === '') {
      return '—';
    }
    return typeof answer === 'number' ? answer.toString() : answer;
  };

  const renderCompletedSurveyList = () => {
    if (sortedCompletedSurveys.length === 0) return null;
    return (
      <div className="profile-plan-surveys profile-plan-surveys--history">
        <h3>Atliktos apklausos</h3>
        <ul className="profile-plan-surveys__history">
          {sortedCompletedSurveys.map((survey) => {
            const timestamp = survey.submitted_at ?? survey.completed_at ?? survey.scheduled_at;
            return (
              <li
                key={`${survey.id}-${survey.response_id ?? 'noresp'}`}
                className="profile-survey-row profile-survey-row--completed"
                onClick={() => navigate(`/surveys/${survey.id}?view=readonly`, { state: { readOnlyFromProfile: true } })}
              >
                <div>
                  <strong>{timestamp ? new Date(timestamp).toLocaleString('lt-LT') : '—'}</strong>
                  <span className="profile-survey-row__plan">{survey.plan_name_snapshot}</span>
                </div>
                <div className="profile-survey-row__meta">
                  <span className="survey-status survey-status--completed">Atlikta</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  useEffect(() => {
    if (!birthYear || !birthMonth) {
      if (birthDay) {
        setBirthDay('');
      }
      return;
    }
    const maxDay = new Date(Number(birthYear), Number(birthMonth), 0).getDate();
    if (birthDay && Number(birthDay) > maxDay) {
      setBirthDay(String(maxDay).padStart(2, '0'));
    }
  }, [birthYear, birthMonth, birthDay]);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? '');
      setLastName(user.last_name ?? '');
      setGoal(user.goal ?? 'balanced');
      setHeightCm(user.height_cm ? String(user.height_cm) : '');
      setWeightKg(user.weight_kg ? String(user.weight_kg) : '');
      setActivityLevel(user.activity_level ?? 'moderate');
      setDietaryPreferences(user.dietary_preferences ?? '');
      setAllergies(user.allergies ?? []);
      const [year = '', month = '', day = ''] = (user.birth_date ?? '').split('-');
      setBirthYear(year);
      setBirthMonth(month);
      setBirthDay(day);
    }
  }, [user]);

  const loadPurchases = useCallback(async () => {
    setLoadingPurchases(true);
    setPurchaseError(null);
    try {
      const data = await fetchPurchases();
      const visible = data.filter((purchase) => purchase.status !== 'canceled');
      setPurchases(visible);
    } catch (err) {
      setPurchaseError('Nepavyko įkelti pirkimų istorijos.');
    } finally {
      setLoadingPurchases(false);
    }
  }, []);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const handleBirthYearChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setBirthYear(event.target.value);
  };

  const handleBirthMonthChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setBirthMonth(event.target.value);
  };

  const handleBirthDayChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setBirthDay(event.target.value);
  };

  const clearBirthDate = () => {
    setBirthYear('');
    setBirthMonth('');
    setBirthDay('');
  };

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

  const formatCurrency = (value: number, currency = 'EUR') =>
    new Intl.NumberFormat('lt-LT', { style: 'currency', currency }).format(value);

  const formatStatus = (status: string) => {
    const map: Record<string, string> = {
      paid: 'Apmokėta',
      pending: 'Laukiama',
      canceled: 'Atšaukta',
    };
    return map[status] ?? status;
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
        allergies,
        birth_date:
          birthYear && birthMonth && birthDay ? `${birthYear}-${birthMonth}-${birthDay}` : undefined,
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

  const handleDownloadReceipt = async (purchaseId: number) => {
    setDownloadingId(purchaseId);
    setPurchaseError(null);
    try {
      const blob = await downloadPurchaseReceipt(purchaseId);
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `FitBite_planas_${purchaseId}.pdf`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setPurchaseError('Nepavyko atsisiųsti pasirinkto plano. Bandykite dar kartą.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCancelPurchase = async (purchaseId: number) => {
    setCancelingId(purchaseId);
    setPurchaseError(null);
    setStatusMessage(null);
    try {
      await cancelPurchase(purchaseId);
      await loadPurchases();
      await refreshProfile();
      setStatusMessage('Planas atšauktas sėkmingai.');
    } catch (err) {
      setPurchaseError('Nepavyko atšaukti plano.');
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-page__intro">
        <div>
          <h1>Mano paskyra</h1>
          <p>Tvarkykite profilio duomenis ir tikslus, kad gautumėte jums tinkamiausius planus.</p>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {user.eligible_first_purchase_discount && (
            <div className="profile-discount-card">
              <strong>-15% pirmam mitybos planui</strong>
              <p style={{ margin: '6px 0 0' }}>
                Nuolaida pritaikoma automatiškai perkant pirmą kartą. Norite kitokios nuolaidos? Išbandykite gimtadienio kodą.
              </p>
            </div>
          )}
          {bmi && (
            <div className="profile-bmi-card">
              <strong>KMI: {bmi}</strong>
              {bmiCategory && <p style={{ margin: '6px 0 0' }}>{bmiCategory}</p>}
            </div>
          )}
        </div>
      </div>

      {(statusMessage || errorMessage) && (
        <div className="profile-status">
          {statusMessage && <div className="success-banner">{statusMessage}</div>}
          {errorMessage && <div className="error-banner">{errorMessage}</div>}
        </div>
      )}

      <div className="profile-page__grid">
        <div className="profile-page__column">
          <section className="profile-card profile-card--form">
            <h2>Pagrindinė informacija</h2>
            <form onSubmit={handleProfileSubmit} className="profile-form">
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
            <div className="form-field">
              <label htmlFor="birth-date-year">Gimimo data</label>
              <div className="birthdate-picker">
                <select id="birth-date-year" value={birthYear} onChange={handleBirthYearChange}>
                  <option value="">Metai</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <select id="birth-date-month" value={birthMonth} onChange={handleBirthMonthChange}>
                  <option value="">Mėnuo</option>
                  {MONTH_OPTIONS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <select
                  id="birth-date-day"
                  value={birthDay}
                  onChange={handleBirthDayChange}
                  disabled={!birthYear || !birthMonth}
                >
                  <option value="">Diena</option>
                  {dayOptions.map((day) => (
                    <option key={day} value={day}>
                      {Number(day)}
                    </option>
                  ))}
                </select>
              </div>
              <small style={{ color: '#6b7280', marginTop: 6 }}>
                Pirmiausia pasirinkite metus, tada mėnesį ir dieną.
              </small>
              {(birthYear || birthMonth || birthDay) && (
                <button
                  type="button"
                  onClick={clearBirthDate}
                  style={{
                    marginTop: 8,
                    background: 'none',
                    border: 'none',
                    color: '#1d4ed8',
                    cursor: 'pointer',
                    padding: 0,
                    alignSelf: 'flex-start',
                    fontSize: '0.9rem',
                  }}
                >
                  Išvalyti
                </button>
              )}
            </div>
            <FormField
              id="dietary_preferences"
              label="Pageidaujami mitybos tipai"
              as="textarea"
              value={dietaryPreferences}
              onChange={(event) => setDietaryPreferences(event.target.value)}
            />
            <div className="form-field">
              <label htmlFor="allergies">Alergijos</label>
              <select
                id="allergies"
                multiple
                value={allergies}
                onChange={handleAllergyChange}
                style={{ minHeight: 140 }}
              >
                {ALLERGEN_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <small style={{ color: '#6b7280', marginTop: 6, display: 'block' }}>
                Pažymėkite visas alergijas. Laikykite nuspaudę „Ctrl“ (Windows) arba „⌘“ (Mac), kad pasirinktumėte kelias.
              </small>
              {allergies.length > 0 && (
                <AllergenBadgeList allergens={allergies} size="compact" style={{ marginTop: 8 }} />
              )}
            </div>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saugoma...' : 'Išsaugoti'}
            </button>
            </form>
          </section>

          <section className="profile-card profile-card--avatar">
            <h2>Profilio nuotrauka</h2>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="Profilio nuotrauka" className="avatar-preview" width={96} height={96} />
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
            <label className="secondary-button" style={{ display: 'inline-flex', alignSelf: 'center', cursor: 'pointer' }}>
              {isUploading ? 'Įkeliama...' : 'Pasirinkti nuotrauką'}
              <input type="file" accept="image/png,image/jpeg" onChange={handleAvatarUpload} hidden />
            </label>
          </section>
        </div>

        <div className="profile-page__column profile-page__column--aside">
          <section className="profile-card profile-card--plan">
            <h2>Aktyvus planas</h2>
            {planProgress ? (
              <div className="profile-plan-card">
                <div className="profile-plan-card__header">
                  <div>
                    <strong>{planProgress.plan_name}</strong>
                    <p>
                      {progressPercent}% užbaigta · {planProgress.completed_days}/{planProgress.total_days} d.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => navigate(`/plans/${planProgress.plan_id}`)}
                  >
                    Peržiūrėti planą
                  </button>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar__value"
                    style={{ width: `${progressPercent}%`, backgroundColor: progressBarColor }}
                  />
                </div>
                <div className="profile-plan-card__meta">
                  <span>Pradžia: {formattedStart}</span>
                  <span>Pabaiga: {formattedFinish}</span>
                  <span>Liko: {planProgress.remaining_days} d.</span>
                </div>
                {progressStatus && <small>{progressStatus}</small>}
                {renderSurveyList()}
              </div>
            ) : planName ? (
              <div className="profile-plan-card">
                <div className="profile-plan-card__header">
                  <div>
                    <strong>{planName}</strong>
                    <p>Šiam planui dar nenustatytas progresas, tačiau apklausos laukia jūsų atsakymo.</p>
                  </div>
                  {planIdForNavigation && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => navigate(`/plans/${planIdForNavigation}`)}
                    >
                      Peržiūrėti planą
                    </button>
                  )}
                </div>
                {renderSurveyList()}
              </div>
            ) : (
              <div className="profile-plan-card profile-plan-card--empty">
                <p>
                  Šiuo metu neturite aktyvaus plano. Pasirinkite jums tinkamiausią ir stebėkite progresą čia.
                </p>
                <button type="button" className="primary-button" onClick={() => navigate('/plans')}>
                  Pasirinkti planą
                </button>
              </div>
            )}
            {renderCompletedSurveyList()}
          </section>

          <section className="profile-card profile-card--purchases">
            <div>
              <h2>Įsigyti planai</h2>
              <p>Visi jūsų atlikti apmokėjimai ir aktyvūs planai. PDF kvitus galite atsisiųsti bet kada.</p>
            </div>
            {purchaseError && <div className="error-banner">{purchaseError}</div>}
            {isLoadingPurchases ? (
              <div className="page-loading" style={{ minHeight: 80 }}>Kraunama pirkimų istorija...</div>
            ) : purchases.length === 0 ? (
              <p>Kol kas neturite užsakytų planų. Išsirinkite mitybos planą ir atlikite apmokėjimą.</p>
            ) : (
              <div className="profile-purchases__list">
                {purchases.map((purchase) => {
                  const isPaid = purchase.status === 'paid';
                  const isCanceled = purchase.status === 'canceled';
                  return (
                    <div key={purchase.id} className="profile-purchases__item">
                      <div>
                        <strong>{purchase.plan_name_snapshot}</strong>
                        <div className="profile-purchases__item-meta">
                          {new Date(purchase.created_at).toLocaleDateString('lt-LT')} · {purchase.period_days} dienų ·{' '}
                          {formatCurrency(purchase.total_price, purchase.currency)}
                        </div>
                        <div className="profile-purchases__item-meta">
                          Statusas: {formatStatus(purchase.status)}
                          {purchase.transaction_reference && ` · ${purchase.transaction_reference}`}
                        </div>
                        {purchase.discount_amount > 0 && (
                          <div className="profile-purchases__item-meta">
                            Nuolaida: {purchase.discount_label ?? 'Nuolaida'} −
                            {formatCurrency(purchase.discount_amount, purchase.currency)}
                            {purchase.discount_code && ` (kodas ${purchase.discount_code})`}
                          </div>
                        )}
                      </div>
                      <div className="profile-purchases__actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => navigate(`/plans/${purchase.plan_id}`)}
                        >
                          Peržiūrėti planą
                        </button>
                        {isPaid && (
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => handleDownloadReceipt(purchase.id)}
                            disabled={downloadingId === purchase.id}
                          >
                            {downloadingId === purchase.id ? 'Atsisiunčiama...' : 'Atsisiųsti PDF'}
                          </button>
                        )}
                        {!isCanceled && (
                          <button
                            type="button"
                            className="secondary-button danger-button"
                            onClick={() => handleCancelPurchase(purchase.id)}
                            disabled={cancelingId === purchase.id}
                          >
                            {cancelingId === purchase.id ? 'Atšaukiama...' : 'Atšaukti planą'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
