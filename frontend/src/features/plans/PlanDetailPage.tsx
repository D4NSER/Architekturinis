import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { fetchPlanDetail, selectPlan } from '../../api/plans';
import type { NutritionPlanDetail } from '../../types';
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

export const PlanDetailPage = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { refreshProfile, user } = useAuth();
  const [plan, setPlan] = useState<NutritionPlanDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isSelecting, setSelecting] = useState(false);

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
          <button
            type="button"
            className="primary-button"
            onClick={handleSelectPlan}
            disabled={isSelecting || isCurrent}
          >
            {isCurrent ? 'Šis planas jau pasirinktas' : isSelecting ? 'Priskiriama...' : 'Priskirti šį planą'}
          </button>
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
