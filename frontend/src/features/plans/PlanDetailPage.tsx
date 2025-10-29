import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { fetchPlanDetail, selectPlan } from '../../api/plans';
import type { NutritionPlanDetail, PlanPricingOption } from '../../types';
import { useAuth } from '../auth/AuthContext';

const orderedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const dayLabelMap: Record<string, string> = {
  monday: 'Pirmadienis',
  tuesday: 'Antradienis',
  wednesday: 'Trečiadienis',
  thursday: 'Ketvirtadienis',
  friday: 'Penktadienis',
  saturday: 'Šeštadienis',
  sunday: 'Sekmadienis',
};

const groupByDay = (meals: NutritionPlanDetail['meals']) => {
  return meals.reduce<Record<string, NutritionPlanDetail['meals']>>((acc, meal) => {
    if (!acc[meal.day_of_week]) {
      acc[meal.day_of_week] = [];
    }
    acc[meal.day_of_week].push(meal);
    return acc;
  }, {});
};

const goalLabelMap: Record<string, string> = {
  weight_loss: 'Svorio mažinimas',
  muscle_gain: 'Raumenų auginimas',
  balanced: 'Subalansuota mityba',
  vegetarian: 'Vegetariškas gyvenimo būdas',
  performance: 'Sportas ir didelis krūvis',
};

const goalFeatureMap: Record<string, string[]> = {
  weight_loss: [
    'Subalansuotas kalorijų deficitas kiekvienai dienai',
    'Daug daržovių ir liesų baltymų sotumo jausmui',
    'Lengvai sekama savaitinė struktūra su aiškiais patiekalais',
  ],
  muscle_gain: [
    'Kaloringi patiekalai raumenų atsistatymui',
    'Baltyminiai užkandžiai tarp pagrindinių valgymų',
    'Pritaikyta intensyvioms treniruotėms ir masės auginimui',
  ],
  balanced: [
    'Kasdieniai patiekalai su subalansuotais makroelementais',
    'Lengvas kalorijų perteklius energijai visai dienai',
    'Puikiai tinka užimtiems žmonėms, ieškantiems stabilios rutinos',
  ],
  vegetarian: [
    'Pilnavertė augalinė mityba be kompromisų',
    'Gausu baltymų iš augalinių šaltinių',
    'Tinka vegetarianams ir tiems, kurie vengia mėsos',
  ],
  performance: [
    'Padidinta angliavandenių dalis prieš ir po treniruočių',
    'Funkciniai patiekalai aukštam fiziniam krūviui',
    'Papildomi užkandžiai energijai per visą dieną palaikyti',
  ],
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const formatCurrency = (value: number, currency = 'EUR') =>
  new Intl.NumberFormat('lt-LT', { style: 'currency', currency }).format(value);
const formatPeriodLabel = (days: number) => {
  if (days === 1) return '1 diena';
  if (days >= 10) return `${days} dienų`;
  return `${days} dienos`;
};

const FIRST_PURCHASE_DISCOUNT = 0.15;

const periodCardStyle = {
  marginTop: 16,
  padding: '16px 18px',
  borderRadius: 16,
  border: '1px solid rgba(99, 102, 241, 0.25)',
  background: 'rgba(129, 140, 248, 0.08)',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 12,
};

const priceEmphasisStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 4,
  fontWeight: 600,
  color: '#312e81',
};

const priceAmountStyle = {
  fontSize: '1.5rem',
  lineHeight: 1.2,
};

const pricePerDayStyle = {
  fontSize: '0.85rem',
  color: '#4338ca',
};

export const PlanDetailPage = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { refreshProfile, user } = useAuth();
  const [plan, setPlan] = useState<NutritionPlanDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isSelecting, setSelecting] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!planId) {
        setErrorMessage('Nerastas plano identifikatorius.');
        return;
      }
      setLoading(true);
      setErrorMessage(null);
      try {
        const detail = await fetchPlanDetail(Number(planId));
        setPlan(detail);
      } catch (err) {
        setErrorMessage('Nepavyko įkelti plano informacijos.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [planId]);

  const groupedMeals = useMemo(() => (plan ? groupByDay(plan.meals) : {}), [plan]);
  const totalMeals = plan?.meals.length ?? 0;
  const uniqueDaysCount = plan ? new Set(plan.meals.map((meal) => meal.day_of_week)).size : 0;

  const featureList = useMemo(() => {
    if (!plan) return [];
    if (plan.is_custom) {
      return [
        '100% pritaikytas jūsų pasirinktiems patiekalams',
        'Galite atnaujinti bet kuriuo metu profilio puslapyje',
        'Matote visą savaitės struktūrą ir makroelementus vienoje vietoje',
      ];
    }
    return goalFeatureMap[plan.goal_type] ?? [
      'Subalansuota savaitės struktūra',
      'Aiškus makroelementų paskirstymas',
      'Lengvai derinami patiekalai kasdienai',
    ];
  }, [plan]);

  const sortedPricingOptions = useMemo<PlanPricingOption[]>(() => {
    if (!plan?.pricing_options?.length) return [];
    return plan.pricing_options.slice().sort((a, b) => a.period_days - b.period_days);
  }, [plan]);

  useEffect(() => {
    if (sortedPricingOptions.length > 0) {
      setSelectedPeriod(sortedPricingOptions[0].period_days);
    } else {
      setSelectedPeriod(null);
    }
  }, [sortedPricingOptions]);

  const selectedPricingOption = useMemo(() => {
    if (!selectedPeriod) return null;
    return sortedPricingOptions.find((option) => option.period_days === selectedPeriod) ?? null;
  }, [selectedPeriod, sortedPricingOptions]);

  const eligibleFirstPurchase = Boolean(user?.eligible_first_purchase_discount);

  const pricePerDay = useMemo(() => {
    if (!selectedPricingOption) return null;
    const discountPercent = eligibleFirstPurchase ? FIRST_PURCHASE_DISCOUNT : 0;
    const final = selectedPricingOption.final_price * (1 - discountPercent);
    return final / selectedPricingOption.period_days;
  }, [selectedPricingOption, eligibleFirstPurchase]);

  const priceBreakdown = useMemo(() => {
    if (!selectedPricingOption) return null;
    const currency = selectedPricingOption.currency ?? 'EUR';
    const basePrice = selectedPricingOption.final_price;
    const discountPercent = eligibleFirstPurchase ? FIRST_PURCHASE_DISCOUNT : 0;
    const finalPrice = Number((basePrice * (1 - discountPercent)).toFixed(2));
    const discountAmount = Number((basePrice - finalPrice).toFixed(2));
    return {
      currency,
      basePrice,
      finalPrice,
      discountAmount,
      discountPercent,
      periodDays: selectedPricingOption.period_days,
    };
  }, [selectedPricingOption, eligibleFirstPurchase]);

  const handlePeriodChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedPeriod(Number(event.target.value));
  };

  const handleSelectPlan = async () => {
    if (!plan) return;
    setSelecting(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await selectPlan(plan.id);
      await refreshProfile();
      setStatusMessage('Planą sėkmingai priskyrėme jūsų paskyrai.');
    } catch (err) {
      setErrorMessage('Nepavyko priskirti plano.');
    } finally {
      setSelecting(false);
    }
  };

  const handleCheckout = () => {
    if (!plan || !selectedPricingOption) return;
    navigate(`/plans/${plan.id}/checkout?period=${selectedPricingOption.period_days}`);
  };

  if (isLoading) {
    return <div className="page-loading">Kraunama plano informacija...</div>;
  }

  if (!plan) {
    return (
      <div className="page-card">
        <h2>Planas nerastas</h2>
        <p>Pabandykite grįžti į planų sąrašą ir pasirinkti kitą planą.</p>
        <button type="button" className="secondary-button" onClick={() => navigate('/plans')}>
          Grįžti į sąrašą
        </button>
      </div>
    );
  }

  const isCurrent = user?.current_plan_id === plan.id;

  return (
    <div className="page-card plan-detail-page">
      <button type="button" className="secondary-button" onClick={() => navigate('/plans')}>
        ← Atgal į planų biblioteką
      </button>

      <header className="plan-hero">
        <div className="plan-hero__info">
          <span className="plan-tag">{plan.is_custom ? 'Individualus planas' : 'FitBite planas'}</span>
          <h1>{plan.name}</h1>
          <p className="plan-lead">{plan.description}</p>
          <div className="plan-meta">
            <span className="plan-pill">{goalLabelMap[plan.goal_type] ?? plan.goal_type}</span>
            <span className="plan-pill">{uniqueDaysCount} dienos</span>
            <span className="plan-pill">{totalMeals} patiekalų</span>
          </div>
        </div>
        <aside className="plan-hero__macros">
          <h3>Makroelementų santrauka</h3>
          <ul>
            <li>
              <strong>{plan.calories ?? 'n/a'}</strong>
              <span>kcal per dieną</span>
            </li>
            <li>
              <strong>{plan.protein_grams ?? 0} g</strong>
              <span>baltymų</span>
            </li>
            <li>
              <strong>{plan.carbs_grams ?? 0} g</strong>
              <span>angliavandenių</span>
            </li>
            <li>
              <strong>{plan.fats_grams ?? 0} g</strong>
              <span>riebalų</span>
            </li>
          </ul>
          {sortedPricingOptions.length > 0 && (
            <div className="plan-pricing" style={periodCardStyle}>
              <label className="form-label" htmlFor="plan-period-select">
                Pasirinkite plano periodą
              </label>
              <select
                id="plan-period-select"
                value={selectedPeriod ?? ''}
                onChange={handlePeriodChange}
                className="input-select"
                style={{ fontWeight: 600, fontSize: '1rem', padding: '10px 14px', borderRadius: 12 }}
              >
                {sortedPricingOptions.map((option) => (
                  <option key={option.period_days} value={option.period_days}>
                    {formatPeriodLabel(option.period_days)}
                  </option>
                ))}
              </select>
              {priceBreakdown && (
                <div className="plan-pricing__totals" style={priceEmphasisStyle}>
                  {priceBreakdown.discountAmount > 0 ? (
                    <>
                      <span style={{ fontSize: '0.95rem', textDecoration: 'line-through', opacity: 0.6 }}>
                        {formatCurrency(priceBreakdown.basePrice, priceBreakdown.currency)}
                      </span>
                      <span style={priceAmountStyle}>
                        {formatCurrency(priceBreakdown.finalPrice, priceBreakdown.currency)}
                      </span>
                      <small>
                        Nuolaida: −{formatCurrency(priceBreakdown.discountAmount, priceBreakdown.currency)} ({Math.round(priceBreakdown.discountPercent * 100)}%)
                      </small>
                    </>
                  ) : (
                    <span style={priceAmountStyle}>
                      {formatCurrency(priceBreakdown.finalPrice, priceBreakdown.currency)}
                    </span>
                  )}
                  <span>Galutinė suma už {formatPeriodLabel(priceBreakdown.periodDays)}</span>
                  {pricePerDay && (
                    <span style={pricePerDayStyle}>
                      ~ {formatCurrency(pricePerDay, priceBreakdown.currency)} už dieną
                    </span>
                  )}
                  {eligibleFirstPurchase && priceBreakdown.discountAmount > 0 && (
                    <small>-15% pirmo pirkimo nuolaida pritaikyta automatiškai.</small>
                  )}
                </div>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="primary-button"
              onClick={handleSelectPlan}
              disabled={isSelecting || isCurrent}
            >
              {isCurrent ? 'Šis planas jau pasirinktas' : isSelecting ? 'Priskiriama...' : 'Priskirti šį planą'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handleCheckout}
              disabled={!selectedPricingOption}
            >
              Įsigyti planą
            </button>
          </div>
          {plan.is_custom && (
            <small style={{ display: 'block', marginTop: 12 }}>
              Šis planas sukurtas pagal jūsų individualius patiekalus. Naują variantą galite sudaryti bet kada.
            </small>
          )}
        </aside>
      </header>

      {statusMessage && <div className="success-banner">{statusMessage}</div>}
      {errorMessage && <div className="error-banner">{errorMessage}</div>}

      <section className="plan-highlight">
        <h2>Ką gausite su šiuo planu?</h2>
        <ul>
          {featureList.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
        <div className="plan-highlight__cta">
          <div>
            <h3>Klausimų ar norite korekcijų?</h3>
            <p>Parašykite mums ir FitBite komanda padės pritaikyti planą dar tiksliau jūsų rutinai.</p>
          </div>
          <a className="secondary-button" href="mailto:info@fitbite.lt">
            Susisiekti su FitBite
          </a>
        </div>
      </section>

      <section className="plan-schedule">
        <h2>Savaitės meniu</h2>
        {orderedDays
          .filter((day) => groupedMeals[day])
          .map((day) => (
            <div key={day} className="plan-card plan-day">
              <header>
                <h3>{dayLabelMap[day]}</h3>
                <span>{groupedMeals[day]!.length} patiekalai</span>
              </header>
              <div className="meals-grid">
                {groupedMeals[day]!.map((meal) => (
                  <div key={meal.id} className="meal-row">
                    <div>
                      <strong>{capitalize(meal.meal_type)}</strong>
                      <div>{meal.title}</div>
                      {meal.description && <small style={{ display: 'block', marginTop: 4 }}>{meal.description}</small>}
                    </div>
                    {meal.calories && (
                      <span style={{ fontWeight: 600 }}>
                        {meal.calories} kcal
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
      </section>
    </div>
  );
};

export default PlanDetailPage;
