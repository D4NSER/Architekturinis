import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';

import {
  createCustomPlan,
  fetchPlans,
  fetchRecommendedPlan,
  selectPlan,
} from '../../api/plans';
import type {
  NutritionPlanDetail,
  NutritionPlanSummary,
} from '../../types';
import { useAuth } from '../auth/AuthContext';
import { FormField } from '../../components/FormField';

interface CustomMealForm {
  day_of_week: string;
  meal_type: string;
  title: string;
  description: string;
  calories?: string;
  protein_grams?: string;
  carbs_grams?: string;
  fats_grams?: string;
}

const daysOfWeek = [
  { value: 'monday', label: 'Pirmadienis' },
  { value: 'tuesday', label: 'Antradienis' },
  { value: 'wednesday', label: 'Trečiadienis' },
  { value: 'thursday', label: 'Ketvirtadienis' },
  { value: 'friday', label: 'Penktadienis' },
  { value: 'saturday', label: 'Šeštadienis' },
  { value: 'sunday', label: 'Sekmadienis' },
];

const mealTypes = [
  'Pusryčiai',
  'Priešpiečiai',
  'Pietūs',
  'Pavakariai',
  'Vakarienė',
];

export const PlansPage = () => {
  const { refreshProfile, user } = useAuth();

  const [plans, setPlans] = useState<NutritionPlanSummary[]>([]);
  const [recommendedPlan, setRecommendedPlan] = useState<NutritionPlanDetail | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [customName, setCustomName] = useState('Mano individualus planas');
  const [customDescription, setCustomDescription] = useState(
    'Savaitės planas pagal mano pasirinktus patiekalus.',
  );
  const [customMeal, setCustomMeal] = useState<CustomMealForm>({
    day_of_week: daysOfWeek[0].value,
    meal_type: mealTypes[0],
    title: '',
    description: '',
  });
  const [customMeals, setCustomMeals] = useState<CustomMealForm[]>([]);
  const [isSubmitting, setSubmitting] = useState(false);
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
        setPlans(plansResponse);
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

  const planMeta = useMemo(() => {
    if (!recommendedPlan) return null;
    const totals = recommendedPlan.meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.calories ?? 0),
        protein: acc.protein + (meal.protein_grams ?? 0),
        carbs: acc.carbs + (meal.carbs_grams ?? 0),
        fats: acc.fats + (meal.fats_grams ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 },
    );
    return totals;
  }, [recommendedPlan]);

  const handleSelectPlan = async (planId: number) => {
    try {
      await selectPlan(planId);
      await refreshProfile();
      setStatusMessage('Planas priskirtas sėkmingai.');
    } catch (err) {
      setError('Nepavyko priskirti plano.');
    }
  };

  const handleMealFieldChange = (field: keyof CustomMealForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setCustomMeal((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const addMealToPlan = () => {
    if (!customMeal.title) {
      setError('Įveskite patiekalo pavadinimą prieš pridedant.');
      return;
    }
    setCustomMeals((prev) => [...prev, customMeal]);
    setCustomMeal({
      day_of_week: customMeal.day_of_week,
      meal_type: customMeal.meal_type,
      title: '',
      description: '',
      calories: undefined,
      protein_grams: undefined,
      carbs_grams: undefined,
      fats_grams: undefined,
    });
  };

  const handleCustomPlanSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (customMeals.length === 0) {
      setError('Pridėkite bent vieną patiekalą.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setStatusMessage(null);
    try {
      await createCustomPlan({
        name: customName,
        description: customDescription,
        meals: customMeals.map((meal) => ({
          day_of_week: meal.day_of_week,
          meal_type: meal.meal_type,
          title: meal.title,
          description: meal.description,
          calories: meal.calories ? Number(meal.calories) : undefined,
          protein_grams: meal.protein_grams ? Number(meal.protein_grams) : undefined,
          carbs_grams: meal.carbs_grams ? Number(meal.carbs_grams) : undefined,
          fats_grams: meal.fats_grams ? Number(meal.fats_grams) : undefined,
        })),
      });
      await refreshProfile();
      const updatedPlans = await fetchPlans();
      setPlans(updatedPlans);
      setCustomMeals([]);
      setStatusMessage('Individualus planas sukurtas.');
    } catch (err) {
      setError('Nepavyko sukurti individualaus plano.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="page-loading">Kraunama...</div>;
  }

  return (
    <div className="page-card">
      <h2>Mitybos planai</h2>
      <p>
        Čia rasite rekomenduojamą planą pagal jūsų tikslus, visą planų biblioteką ir galėsite susikurti
        individualų savaitės planą.
      </p>

      {statusMessage && <div className="success-banner">{statusMessage}</div>}
      {error && <div className="error-banner">{error}</div>}

      {recommendedPlan && (
        <section className="plan-card">
          <h3>Rekomenduojamas planas: {recommendedPlan.name}</h3>
          <p>{recommendedPlan.description}</p>
          {planMeta && (
            <p>
              {planMeta.calories} kcal · {planMeta.protein}g baltymų · {planMeta.carbs}g angliavandenių ·{' '}
              {planMeta.fats}g riebalų
            </p>
          )}
          <div className="meals-grid">
            {recommendedPlan.meals.map((meal) => (
              <div key={meal.id} className="meal-row">
                <div>
                  <strong>{meal.day_of_week.toUpperCase()} · {meal.meal_type}</strong>
                  <div>{meal.title}</div>
                </div>
                {meal.calories && <span>{meal.calories} kcal</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid" style={{ marginTop: 32 }}>
        <div>
          <h3>Pasirinkti planą</h3>
          <p>Pasirinkite paruoštą mitybos planą ir matykite visą informaciją.</p>
          <div className="grid">
            {plans.map((plan) => (
              <div key={plan.id} className="plan-card">
                <h3>{plan.name}</h3>
                <p>{plan.description}</p>
                <p>
                  Tikslas: <strong>{plan.goal_type}</strong>
                </p>
                {plan.calories && (
                  <p>
                    {plan.calories} kcal · {plan.protein_grams ?? 0}g baltymų · {plan.carbs_grams ?? 0}g{' '}
                    angliavandenių · {plan.fats_grams ?? 0}g riebalų
                  </p>
                )}
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={currentPlanId === plan.id}
                >
                  {currentPlanId === plan.id ? 'Pasirinkta' : 'Pasirinkti planą'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3>Individualus savaitės planas</h3>
          <p>Sukurkite savo planą pasirinkdami patiekalus kiekvienai savaitės dienai.</p>
          <form onSubmit={handleCustomPlanSubmit} className="grid" style={{ gap: 16 }}>
            <FormField
              id="custom_name"
              label="Planas"
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
            />
            <FormField
              id="custom_description"
              label="Trumpas aprašymas"
              as="textarea"
              value={customDescription}
              onChange={(event) => setCustomDescription(event.target.value)}
            />

            <div className="plan-card" style={{ padding: 16 }}>
              <h4>Pridėkite patiekalą</h4>
              <label htmlFor="day_of_week">Diena</label>
              <select
                id="day_of_week"
                value={customMeal.day_of_week}
                onChange={handleMealFieldChange('day_of_week')}
                style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #cfd8e3' }}
              >
                {daysOfWeek.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>

              <label htmlFor="meal_type" style={{ marginTop: 12 }}>Patiekalų tipas</label>
              <select
                id="meal_type"
                value={customMeal.meal_type}
                onChange={handleMealFieldChange('meal_type')}
                style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #cfd8e3' }}
              >
                {mealTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <FormField
                id="custom_title"
                label="Pavadinimas"
                value={customMeal.title}
                onChange={handleMealFieldChange('title')}
                required
              />
              <FormField
                id="custom_description"
                label="Aprašymas"
                value={customMeal.description}
                as="textarea"
                onChange={handleMealFieldChange('description')}
              />

              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
                <FormField
                  id="meal_calories"
                  label="Kalorijos"
                  type="number"
                  value={customMeal.calories ?? ''}
                  onChange={handleMealFieldChange('calories')}
                />
                <FormField
                  id="meal_protein"
                  label="Baltymai (g)"
                  type="number"
                  value={customMeal.protein_grams ?? ''}
                  onChange={handleMealFieldChange('protein_grams')}
                />
                <FormField
                  id="meal_carbs"
                  label="Angliavandeniai (g)"
                  type="number"
                  value={customMeal.carbs_grams ?? ''}
                  onChange={handleMealFieldChange('carbs_grams')}
                />
                <FormField
                  id="meal_fats"
                  label="Riebalai (g)"
                  type="number"
                  value={customMeal.fats_grams ?? ''}
                  onChange={handleMealFieldChange('fats_grams')}
                />
              </div>

              <button type="button" className="secondary-button" onClick={addMealToPlan}>
                Pridėti patiekalą
              </button>
            </div>

            {customMeals.length > 0 && (
              <div className="plan-card" style={{ padding: 16 }}>
                <h4>Savaitės meniu ({customMeals.length} įrašai)</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                  {customMeals.map((meal, index) => (
                    <li key={`${meal.day_of_week}-${meal.title}-${index}`} className="meal-row">
                      <div>
                        <strong>
                          {daysOfWeek.find((day) => day.value === meal.day_of_week)?.label} · {meal.meal_type}
                        </strong>
                        <div>{meal.title}</div>
                      </div>
                      {meal.calories && <span>{meal.calories} kcal</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? 'Kuriama...' : 'Išsaugoti planą'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default PlansPage;
