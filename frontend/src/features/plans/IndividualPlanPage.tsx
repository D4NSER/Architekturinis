import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { createCustomPlan } from '../../api/plans';
import { useAuth } from '../auth/AuthContext';

interface CustomMealForm {
  day_of_week: string;
  meal_type: string;
  foodId?: string;
  title: string;
  description: string;
  calories?: number;
  protein_grams?: number;
  carbs_grams?: number;
  fats_grams?: number;
}

interface IndividualPlanConfig {
  id: number;
  name: string;
  description: string;
  goal_type: string;
  calorieRange: [number, number];
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

const durationOptions = [
  { id: 3, label: '3 dienų atrankai' },
  { id: 5, label: '5 dienų rutinai' },
  { id: 7, label: '7 dienų savaitei' },
  { id: 14, label: '14 dienų programai' },
];

const individualPlansConfig: Record<string, IndividualPlanConfig> = {
  '9001': {
    id: 9001,
    name: 'Individualus Slim',
    description: 'Sudarykite asmeninį meniu laikydamiesi 1500 – 1800 kcal ribų.',
    goal_type: 'weight_loss',
    calorieRange: [1500, 1800],
  },
  '9002': {
    id: 9002,
    name: 'Individualus Midi',
    description: 'Subalansuotas FitBite planas 1800 – 2200 kcal intervale.',
    goal_type: 'balanced',
    calorieRange: [1800, 2200],
  },
  '9003': {
    id: 9003,
    name: 'Individualus Maxi',
    description: 'Planas didesniam fiziniam krūviui – laikykitės 2200 – 2600 kcal.',
    goal_type: 'performance',
    calorieRange: [2200, 2600],
  },
};

const individualFoodOptions = [
  {
    id: 'grilled-chicken-bowl',
    label: 'Grill vištiena, kuskusas ir daržovės',
    description: 'Baltyminis patiekalas sotumui ir lengvam kalorijų balansui.',
    calories: 420,
    protein: 35,
    carbs: 40,
    fats: 14,
  },
  {
    id: 'salmon-quinoa',
    label: 'Lašiša su bolivine balanda',
    description: 'Omega-3 šaltinis ir pilnaverčiai kompleksiniai angliavandeniai.',
    calories: 520,
    protein: 38,
    carbs: 45,
    fats: 20,
  },
  {
    id: 'veggie-bowl',
    label: 'Daržovių dubenėlis su avinžirniais',
    description: 'Augalinis baltymas ir skaidulinės daržovės lengvai dienai.',
    calories: 360,
    protein: 18,
    carbs: 50,
    fats: 10,
  },
  {
    id: 'oat-smooti',
    label: 'Avižų ir uogų glotnutis',
    description: 'Greitas pusrytis su kompleksiniais angliavandeniais.',
    calories: 280,
    protein: 20,
    carbs: 40,
    fats: 6,
  },
  {
    id: 'protein-snack',
    label: 'Varškės kremas su riešutais',
    description: 'Baltyminis užkandis su sveikaisiais riebalais.',
    calories: 220,
    protein: 22,
    carbs: 12,
    fats: 9,
  },
];

const goalLabelMap: Record<string, string> = {
  weight_loss: 'Svorio mažinimas',
  muscle_gain: 'Raumenų auginimas',
  balanced: 'Subalansuota mityba',
  vegetarian: 'Vegetariškas gyvenimo būdas',
  performance: 'Sportas ir didelis krūvis',
};

export const IndividualPlanPage = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const [planConfig, setPlanConfig] = useState<IndividualPlanConfig | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(7);
  const [customMeal, setCustomMeal] = useState<CustomMealForm>({
    day_of_week: daysOfWeek[0].value,
    meal_type: mealTypes[0],
    foodId: undefined,
    title: '',
    description: '',
  });
  const [customMeals, setCustomMeals] = useState<CustomMealForm[]>([]);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (planId && individualPlansConfig[planId]) {
      setPlanConfig(individualPlansConfig[planId]);
    } else {
      setError('Planas nerastas.');
    }
  }, [planId]);

  const individualNutritionTotals = customMeals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.calories ?? 0),
      protein: acc.protein + (meal.protein_grams ?? 0),
      carbs: acc.carbs + (meal.carbs_grams ?? 0),
      fats: acc.fats + (meal.fats_grams ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );

  const isWithinCalorieRange =
    !planConfig?.calorieRange ||
    (individualNutritionTotals.calories >= planConfig.calorieRange[0] &&
      individualNutritionTotals.calories <= planConfig.calorieRange[1]);

  const handleMealFieldChange = (field: keyof CustomMealForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setCustomMeal((prev) => {
        if (field === 'calories' || field === 'protein_grams' || field === 'carbs_grams' || field === 'fats_grams') {
          return { ...prev, [field]: value ? Number(value) : undefined };
        }
        return { ...prev, [field]: value };
      });
    };

  const handleFoodSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const option = individualFoodOptions.find((item) => item.id === value);
    if (!option) {
      setCustomMeal((prev) => ({
        ...prev,
        foodId: undefined,
        title: '',
        description: '',
        calories: undefined,
        protein_grams: undefined,
        carbs_grams: undefined,
        fats_grams: undefined,
      }));
      return;
    }

    setCustomMeal((prev) => ({
      ...prev,
      foodId: option.id,
      title: option.label,
      description: option.description,
      calories: option.calories,
      protein_grams: option.protein,
      carbs_grams: option.carbs,
      fats_grams: option.fats,
    }));
  };

  const addMealToPlan = () => {
    setError(null);
    setStatusMessage(null);
    if (!customMeal.title) {
      setError('Įveskite patiekalo pavadinimą prieš pridedant.');
      return;
    }
    if (customMeals.length >= 21) {
      setError('Individualų savaitės planą sudaro iki 21 įrašo. Pašalinkite nereikalingus patiekalus, kad pridėtumėte naują.');
      return;
    }
    setCustomMeals((prev) => [...prev, customMeal]);
    setCustomMeal({
      day_of_week: customMeal.day_of_week,
      meal_type: customMeal.meal_type,
      foodId: undefined,
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

    if (!planConfig) {
      setError('Plano konfigūracija nerasta.');
      return;
    }

    if (!isWithinCalorieRange) {
      setError('Kalorijų suma turi atitikti pasirinktą intervalą.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setStatusMessage(null);
    try {
      const planName = `${planConfig.name} (${selectedDuration} d.)`;
      const planDescription = planConfig.description;

      await createCustomPlan({
        name: planName,
        description: planDescription,
        meals: customMeals.map((meal) => ({
          day_of_week: meal.day_of_week,
          meal_type: meal.meal_type,
          title: meal.title,
          description: meal.description,
          calories: meal.calories,
          protein_grams: meal.protein_grams,
          carbs_grams: meal.carbs_grams,
          fats_grams: meal.fats_grams,
        })),
      });
      await refreshProfile();
      setStatusMessage('Individualus planas sukurtas ir priskirtas jūsų paskyrai!');
      setTimeout(() => {
        navigate('/plans');
      }, 2000);
    } catch (err) {
      setError('Nepavyko sukurti individualaus plano.');
    } finally {
      setSubmitting(false);
    }
  };

  const removeCustomMeal = (index: number) => {
    setStatusMessage(null);
    setCustomMeals((prev) => prev.filter((_, mealIndex) => mealIndex !== index));
  };

  if (!planConfig) {
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

  return (
    <div className="page-card plan-detail-page">
      <button type="button" className="secondary-button" onClick={() => navigate('/plans')}>
        ← Atgal į planų biblioteką
      </button>

      <header className="plan-hero">
        <div className="plan-hero__info">
          <span className="plan-tag">Individualus planas</span>
          <h1>{planConfig.name}</h1>
          <p className="plan-lead">{planConfig.description}</p>
          <div className="plan-meta">
            <span className="plan-pill">{goalLabelMap[planConfig.goal_type] ?? planConfig.goal_type}</span>
            <span className="plan-pill">
              {planConfig.calorieRange[0]} – {planConfig.calorieRange[1]} kcal
            </span>
          </div>
        </div>
        <aside className="plan-hero__macros">
          <h3>Jūsų sukurto plano santrauka</h3>
          <ul>
            <li>
              <strong>{individualNutritionTotals.calories}</strong>
              <span>kcal per dieną</span>
            </li>
            <li>
              <strong>{individualNutritionTotals.protein} g</strong>
              <span>baltymų</span>
            </li>
            <li>
              <strong>{individualNutritionTotals.carbs} g</strong>
              <span>angliavandenių</span>
            </li>
            <li>
              <strong>{individualNutritionTotals.fats} g</strong>
              <span>riebalų</span>
            </li>
          </ul>
          {!isWithinCalorieRange && planConfig.calorieRange && (
            <div className="error-banner">
              Kalorijų suma turi būti tarp {planConfig.calorieRange[0]} ir {planConfig.calorieRange[1]} kcal.
            </div>
          )}
        </aside>
      </header>

      {statusMessage && <div className="success-banner">{statusMessage}</div>}
      {error && <div className="error-banner">{error}</div>}

      <section className="plan-highlight">
        <h2>Kaip tai veikia?</h2>
        <ul>
          <li>Pasirinkite programos trukmę (3, 5, 7 arba 14 dienų)</li>
          <li>Pridėkite patiekalus iš FitBite meniu pagal dienas ir valgymo laiką</li>
          <li>Stebėkite, kad bendra kalorijų suma atitiktų pasirinktą intervalą</li>
          <li>Išsaugokite planą – jis automatiškai bus priskirtas jūsų paskyrai</li>
        </ul>
      </section>

      <section className="plans-section plans-section--custom">
        <div className="plan-card plans-custom-summary">
          <h3>Programos trukmė</h3>
          <div className="plan-card__actions">
            {durationOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`plan-duration-pill ${selectedDuration === option.id ? 'plan-duration-pill--active' : ''}`}
                onClick={() => setSelectedDuration(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleCustomPlanSubmit} className="plans-custom-form">
          <div className="plan-card plans-custom-form__builder">
            <h3>Pridėkite patiekalą</h3>
            <label htmlFor="day_of_week">Diena</label>
            <select
              id="day_of_week"
              value={customMeal.day_of_week}
              onChange={handleMealFieldChange('day_of_week')}
              className="plans-custom-form__select"
            >
              {daysOfWeek.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>

            <label htmlFor="meal_type">Patiekalų tipas</label>
            <select
              id="meal_type"
              value={customMeal.meal_type}
              onChange={handleMealFieldChange('meal_type')}
              className="plans-custom-form__select"
            >
              {mealTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <label htmlFor="food_picker">Pasirinkite FitBite patiekalą</label>
            <select
              id="food_picker"
              value={customMeal.foodId ?? ''}
              onChange={handleFoodSelect}
              className="plans-custom-form__select"
            >
              <option value="">– Pasirinkite –</option>
              {individualFoodOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>

            {customMeal.foodId && (
              <div className="plans-food-preview">
                <p>{customMeal.description}</p>
                <div>
                  {customMeal.calories ?? 0} kcal · {customMeal.protein_grams ?? 0}g baltymų ·{' '}
                  {customMeal.carbs_grams ?? 0}g angliavandenių · {customMeal.fats_grams ?? 0}g riebalų
                </div>
              </div>
            )}

            <button type="button" className="secondary-button" onClick={addMealToPlan}>
              Pridėti patiekalą
            </button>
          </div>

          {customMeals.length > 0 && (
            <div className="plan-card plans-custom-form__summary">
              <h3>Savaitės meniu ({customMeals.length} įrašai)</h3>
              <ul>
                {customMeals.map((meal, index) => (
                  <li key={`${meal.day_of_week}-${meal.title}-${index}`}>
                    <div>
                      <strong>
                        {daysOfWeek.find((day) => day.value === meal.day_of_week)?.label} · {meal.meal_type}
                      </strong>
                      <div>{meal.title}</div>
                      <small>
                        {meal.calories ?? 0} kcal · {meal.protein_grams ?? 0}g baltymų · {meal.carbs_grams ?? 0}g
                        angliavandenių · {meal.fats_grams ?? 0}g riebalų
                      </small>
                    </div>
                    <button type="button" className="secondary-button" onClick={() => removeCustomMeal(index)}>
                      Šalinti
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button type="submit" className="primary-button" disabled={isSubmitting || !isWithinCalorieRange}>
            {isSubmitting ? 'Kuriama...' : 'Išsaugoti ir priskirti planą'}
          </button>
        </form>
      </section>
    </div>
  );
};

export default IndividualPlanPage;
