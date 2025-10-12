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
    <div className="page-card">
      <button type="button" className="secondary-button" onClick={() => navigate('/plans')}>
        ← Atgal į planus
      </button>
      <h2 style={{ marginTop: 16 }}>{plan.name}</h2>
      <p>{plan.description}</p>
      <p style={{ fontWeight: 600 }}>
        Tikslas: {goalLabelMap[plan.goal_type] ?? plan.goal_type}
      </p>
      {plan.calories && (
        <p>
          {plan.calories} kcal · {plan.protein_grams ?? 0}g baltymų · {plan.carbs_grams ?? 0}g angliavandenių · {plan.fats_grams ?? 0}g riebalų per dieną
        </p>
      )}

      <div style={{ margin: '16px 0' }}>
        {statusMessage && <div className="success-banner">{statusMessage}</div>}
        {errorMessage && <div className="error-banner">{errorMessage}</div>}
        <button
          type="button"
          className="primary-button"
          onClick={handleSelectPlan}
          disabled={isSelecting || isCurrent}
        >
          {isCurrent ? 'Šis planas jau pasirinktas' : isSelecting ? 'Priskiriama...' : 'Priskirti šį planą'}
        </button>
      </div>

      <section className="grid" style={{ gap: 16 }}>
        {orderedDays
          .filter((day) => groupedMeals[day])
          .map((day) => (
            <div key={day} className="plan-card" style={{ padding: 16 }}>
              <h3 style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{dayLabelMap[day]}</h3>
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
