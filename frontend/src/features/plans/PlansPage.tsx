import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  fetchPlans,
  fetchRecommendedPlan,
  selectPlan,
} from '../../api/plans';
import type { NutritionPlanSummary, RecommendedPlanDetail } from '../../types';
import { useAuth } from '../auth/AuthContext';

interface ExtendedPlan extends NutritionPlanSummary {
  isIndividual?: boolean;
  calorieRange?: [number, number];
}

const goalLabelMap: Record<string, string> = {
  weight_loss: 'Svorio mažinimas',
  muscle_gain: 'Raumenų auginimas',
  balanced: 'Subalansuota mityba',
  vegetarian: 'Vegetariškas gyvenimo būdas',
  performance: 'Sportas ir didelis krūvis',
};

const renderGoalLabel = (goalType: string) => goalLabelMap[goalType] ?? goalType;

const individualPlans: ExtendedPlan[] = [
  {
    id: 9001,
    name: 'Individualus Slim',
    description: 'Sudarykite asmeninį meniu laikydamiesi 1500 – 1800 kcal ribų.',
    goal_type: 'weight_loss',
    calories: 1650,
    protein_grams: 120,
    carbs_grams: 170,
    fats_grams: 55,
    is_custom: true,
    isIndividual: true,
    calorieRange: [1500, 1800],
  },
  {
    id: 9002,
    name: 'Individualus Midi',
    description: 'Subalansuotas FitBite planas 1800 – 2200 kcal intervale.',
    goal_type: 'balanced',
    calories: 2000,
    protein_grams: 140,
    carbs_grams: 210,
    fats_grams: 70,
    is_custom: true,
    isIndividual: true,
    calorieRange: [1800, 2200],
  },
  {
    id: 9003,
    name: 'Individualus Maxi',
    description: 'Planas didesniam fiziniam krūviui – laikykitės 2200 – 2600 kcal.',
    goal_type: 'performance',
    calories: 2400,
    protein_grams: 170,
    carbs_grams: 250,
    fats_grams: 80,
    is_custom: true,
    isIndividual: true,
    calorieRange: [2200, 2600],
  },
];

export const PlansPage = () => {
  const { refreshProfile, user } = useAuth();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<ExtendedPlan[]>([]);
  const [recommendedPlan, setRecommendedPlan] = useState<RecommendedPlanDetail | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [plansResponse, recommendedResponse] = await Promise.all([
          fetchPlans(),
          fetchRecommendedPlan(),
        ]);
        const normalizedPlans = plansResponse.map((plan) => ({ ...plan })) as ExtendedPlan[];
        setPlans([...normalizedPlans, ...individualPlans]);
        setRecommendedPlan(recommendedResponse);
      } catch (err) {
        setError('Nepavyko įkelti mitybos planų.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const currentPlanId = user?.current_plan_id ?? null;
  const currentPlan = useMemo(
    () => plans.find((plan) => plan.id === currentPlanId),
    [plans, currentPlanId],
  );

  const orderedPlans = useMemo(
    () =>
      plans.slice().sort((a, b) => {
        const aIsSelected = a.id === currentPlanId;
        const bIsSelected = b.id === currentPlanId;
        if (aIsSelected && !bIsSelected) return -1;
        if (!aIsSelected && bIsSelected) return 1;
        return a.name.localeCompare(b.name);
      }),
    [plans, currentPlanId],
  );

  const planMeta = useMemo(() => {
    if (!recommendedPlan) return null;
    return recommendedPlan.meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.calories ?? 0),
        protein: acc.protein + (meal.protein_grams ?? 0),
        carbs: acc.carbs + (meal.carbs_grams ?? 0),
        fats: acc.fats + (meal.fats_grams ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 },
    );
  }, [recommendedPlan]);

  const handleSelectPlan = async (planId: number) => {
    try {
      setError(null);
      await selectPlan(planId);
      await refreshProfile();
      const selected = plans.find((planItem) => planItem.id === planId);
      setStatusMessage(selected ? `„${selected.name}" planas priskirtas sėkmingai.` : 'Planas priskirtas sėkmingai.');
    } catch (err) {
      setError('Nepavyko priskirti plano.');
    }
  };

  const handleViewPlan = (planId: number) => {
    const plan = plans.find((p) => p.id === planId);
    if (plan?.isIndividual) {
      navigate(`/plans/individual/${planId}`);
    } else {
      navigate(`/plans/${planId}`);
    }
  };

  if (isLoading) {
    return <div className="page-loading">Kraunama...</div>;
  }

  return (
    <div className="plans-layout">
      <section className="plans-hero">
        <div>
          <span className="plan-tag">FitBite planai</span>
          <h1>Pasirinkite kelią į subalansuotą mitybą</h1>
          <p>
            FitBite siūlo profesionaliai subalansuotas programas įvairiems tikslams – nuo lieknėjimo iki raumenų
            auginimo ir aktyvaus gyvenimo būdo. Pradėkite nuo rekomenduojamo plano arba susikurkite individualų meniu.
          </p>
        </div>
      </section>

      {statusMessage && <div className="success-banner">{statusMessage}</div>}
      {error && <div className="error-banner">{error}</div>}

      {currentPlan && (
        <section className="plans-section plans-section--highlight">
          <h2>Jūsų pasirinktas planas</h2>
          <article className="plan-card plan-card--current">
            <div className="plan-card__header">
              <div>
                <span className="plan-pill">{renderGoalLabel(currentPlan.goal_type)}</span>
                <h3>{currentPlan.name}</h3>
                <p>{currentPlan.description}</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => handleViewPlan(currentPlan.id)}>
                Peržiūrėti detales
              </button>
            </div>
            {currentPlan.calories && (
              <p className="plan-card__meta">
                {currentPlan.calories} kcal · {currentPlan.protein_grams ?? 0}g baltymų ·{' '}
                {currentPlan.carbs_grams ?? 0}g angliavandenių · {currentPlan.fats_grams ?? 0}g riebalų
              </p>
            )}
            <div className="plan-card__actions">
              <button type="button" className="primary-button" onClick={() => handleViewPlan(currentPlan.id)}>
                Tvarkyti planą
              </button>
            </div>
          </article>
        </section>
      )}

      {recommendedPlan && (
        <section className="plans-section">
          <h2>Rekomenduojamas FitBite planas</h2>
          <article className="plan-card plan-card--recommended">
            <div className="plan-card__header">
              <div>
                <span className="plan-pill">{renderGoalLabel(recommendedPlan.goal_type)}</span>
                <h3>{recommendedPlan.name}</h3>
                <p>{recommendedPlan.description}</p>
                {recommendedPlan.recommendation_reason && (
                  <div className="plan-reason">{recommendedPlan.recommendation_reason}</div>
                )}
              </div>
              <div className="plan-card__header-actions">
                <button type="button" className="secondary-button" onClick={() => handleViewPlan(recommendedPlan.id)}>
                  Peržiūrėti detales
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => handleSelectPlan(recommendedPlan.id)}
                  disabled={currentPlanId === recommendedPlan.id}
                >
                  {currentPlanId === recommendedPlan.id ? 'Šis planas jau naudojamas' : 'Priskirti planą'}
                </button>
              </div>
            </div>
            {planMeta && (
              <p className="plan-card__meta">
                {planMeta.calories} kcal · {planMeta.protein}g baltymų · {planMeta.carbs}g angliavandenių ·{' '}
                {planMeta.fats}g riebalų
              </p>
            )}
          </article>
        </section>
      )}

      <section className="plans-section">
        <h2>Visi FitBite planai</h2>
        <p>Sujungėme visus planus į vieną biblioteką, kad lengvai palygintumėte, pasirinktumėte ir atrastumėte savo ritmą.</p>
        <div className="plans-grid">
          {orderedPlans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isRecommended = plan.id === recommendedPlan?.id;
            const isIndividual = Boolean(plan.isIndividual);
            return (
              <article
                key={plan.id}
                className={`plan-card plan-card--grid ${isCurrent ? 'plan-card--current' : ''} ${
                  isRecommended ? 'plan-card--recommended' : ''
                } ${isIndividual ? 'plan-card--individual' : ''}`}
              >
                <span className="plan-pill">{renderGoalLabel(plan.goal_type)}</span>
                <h3>{plan.name}</h3>
                <p>{plan.description}</p>
                {plan.calorieRange && (
                  <p className="plan-card__meta">
                    Tikslinis intervalas: {plan.calorieRange[0]} – {plan.calorieRange[1]} kcal
                  </p>
                )}
                {plan.calories && !plan.calorieRange && (
                  <p className="plan-card__meta">
                    {plan.calories} kcal · {plan.protein_grams ?? 0}g baltymų · {plan.carbs_grams ?? 0}g angliavandenių ·{' '}
                    {plan.fats_grams ?? 0}g riebalų
                  </p>
                )}
                <div className="plan-card__actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => handleViewPlan(plan.id)}
                  >
                    {isIndividual ? 'Sudaryti individualų planą' : isCurrent ? 'Peržiūrėti' : 'Pasirinkti'}
                  </button>
                  {!isIndividual && !isCurrent && (
                    <button type="button" className="secondary-button" onClick={() => handleSelectPlan(plan.id)}>
                      Greitas pasirinkimas
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default PlansPage;
