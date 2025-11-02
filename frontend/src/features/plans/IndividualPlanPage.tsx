import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { createCustomPlan } from '../../api/plans';
import { useAuth } from '../auth/AuthContext';
import type { AllergenId } from '../../types';
import { AllergenBadgeList } from '../../components/AllergenBadgeList';

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
  allergens: AllergenId[];
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
  { value: 'Pusryčiai', label: 'Pusryčiai' },
  { value: 'Pietūs', label: 'Pietūs' },
  { value: 'Vakarienė', label: 'Vakarienė' },
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

interface FoodOption {
  id: string;
  label: string;
  description: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  allergens: AllergenId[];
}

const individualFoodOptions: FoodOption[] = [
  {
    id: 'morning-chia',
    label: 'Chia pudingas su migdolais',
    description: 'Naktinis chia, migdolų pienas, braškės ir šlakelis agavos.',
    mealType: 'Pusryčiai',
    calories: 320,
    protein: 16,
    carbs: 34,
    fats: 11,
    allergens: ['tree_nut'],
  },
  {
    id: 'egg-avocado-toast',
    label: 'Pilno grūdo skrebučiai su avokadu ir kiaušiniu',
    description: 'Traškūs skrebučiai, sutrintas avokadas ir virtas kiaušinis.',
    mealType: 'Pusryčiai',
    calories: 360,
    protein: 18,
    carbs: 38,
    fats: 15,
    allergens: ['gluten', 'egg'],
  },
  {
    id: 'spinach-omelette',
    label: 'Špinatų ir fetos omletas',
    description: 'Purus kiaušinių omletas su špinatais, feta ir pomidorais.',
    mealType: 'Pusryčiai',
    calories: 340,
    protein: 24,
    carbs: 12,
    fats: 20,
    allergens: ['egg', 'milk'],
  },
  {
    id: 'oatmeal-berries',
    label: 'Avižinė košė su uogomis',
    description: 'Pilno grūdo avižos, migdolų pienas, šilauogės ir graikiniai riešutai.',
    mealType: 'Pusryčiai',
    calories: 310,
    protein: 12,
    carbs: 44,
    fats: 10,
    allergens: ['tree_nut'],
  },
  {
    id: 'smoothie-bowl',
    label: 'Jogurtinis smoothie dubenėlis',
    description: 'Graikiškas jogurtas, miško uogos, bananai ir skrudintų sėklų mišinys.',
    mealType: 'Pusryčiai',
    calories: 330,
    protein: 18,
    carbs: 40,
    fats: 12,
    allergens: ['milk'],
  },
  {
    id: 'quinoa-chicken',
    label: 'Vištiena su bolivine balanda',
    description: 'Grilinta vištiena, bolivinės balandos ir citrininiai brokoliai.',
    mealType: 'Pietūs',
    calories: 520,
    protein: 42,
    carbs: 46,
    fats: 16,
    allergens: [],
  },
  {
    id: 'salmon-quinoa',
    label: 'Lašiša su rudaisiais ryžiais ir špinatais',
    description: 'Kepta lašiša, rudi ryžiai ir česnakiniai špinatai.',
    mealType: 'Pietūs',
    calories: 540,
    protein: 40,
    carbs: 48,
    fats: 20,
    allergens: ['fish'],
  },
  {
    id: 'mediterranean-bowl',
    label: 'Viduržemio jūros dubenėlis',
    description: 'Bolivinės balandos, avinžirniai, feta, alyvuogės ir daržovės.',
    mealType: 'Pietūs',
    calories: 480,
    protein: 26,
    carbs: 52,
    fats: 18,
    allergens: ['milk'],
  },
  {
    id: 'beef-bulgur',
    label: 'Jautiena su bulguru ir daržovėmis',
    description: 'Troškinta jautiena, bulguras, cukinijos ir paprika.',
    mealType: 'Pietūs',
    calories: 560,
    protein: 38,
    carbs: 50,
    fats: 20,
    allergens: ['gluten'],
  },
  {
    id: 'veggie-wrap',
    label: 'Daržovių wrap’as su humusu',
    description: 'Pilno grūdo lavašas, humusas, kepta paprika ir salotos.',
    mealType: 'Pietūs',
    calories: 450,
    protein: 20,
    carbs: 56,
    fats: 14,
    allergens: ['gluten', 'sesame'],
  },
  {
    id: 'shrimp-quinoa',
    label: 'Krevetės su bolivine balanda',
    description: 'Keptos krevetės, bolivinės balandos, šparagai ir citrininis padažas.',
    mealType: 'Pietūs',
    calories: 520,
    protein: 34,
    carbs: 48,
    fats: 16,
    allergens: ['shellfish'],
  },
  {
    id: 'turkey-zoodles',
    label: 'Kalakutienos kukuliai su cukinijų makaronais',
    description: 'Lengvos kalakutienos kukuliai, cukinijų „spagečiai“ ir pomidorų padažas.',
    mealType: 'Vakarienė',
    calories: 430,
    protein: 38,
    carbs: 20,
    fats: 18,
    allergens: ['egg'],
  },
  {
    id: 'lemon-cod',
    label: 'Citrininė menkė su saldžiąja bulve',
    description: 'Kepta menkė, trintos saldžiosios bulvės ir garinti žirneliai.',
    mealType: 'Vakarienė',
    calories: 450,
    protein: 36,
    carbs: 32,
    fats: 14,
    allergens: ['fish'],
  },
  {
    id: 'veggie-stirfry',
    label: 'Daržovių stir-fry su tofu',
    description: 'Traškūs brokoliai, paprika, tofu ir rudieji ryžiai.',
    mealType: 'Vakarienė',
    calories: 480,
    protein: 28,
    carbs: 54,
    fats: 16,
    allergens: ['soy'],
  },
  {
    id: 'beef-stew',
    label: 'Troškinta jautiena su saldžiąja bulve',
    description: 'Lėtai troškinta jautiena, saldžiosios bulvės ir morkos žolelių padaže.',
    mealType: 'Vakarienė',
    calories: 520,
    protein: 40,
    carbs: 36,
    fats: 20,
    allergens: [],
  },
  {
    id: 'chickpea-curry',
    label: 'Avinžirnių karis su kokosų pienu',
    description: 'Augalinis karis, avinžirniai, špinatai ir rudi ryžiai.',
    mealType: 'Vakarienė',
    calories: 500,
    protein: 24,
    carbs: 58,
    fats: 18,
    allergens: [],
  },
  {
    id: 'lemon-chicken',
    label: 'Citrininė vištiena su kuskusu',
    description: 'Citrinų sultyse kepta vištiena, pilno grūdo kuskusas ir skrudintos daržovės.',
    mealType: 'Vakarienė',
    calories: 510,
    protein: 38,
    carbs: 46,
    fats: 18,
    allergens: ['gluten'],
  },
];

const dayLabelMap = Object.fromEntries(daysOfWeek.map((day) => [day.value, day.label]));

export const IndividualPlanPage = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const [planConfig, setPlanConfig] = useState<IndividualPlanConfig | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(7);
  const [selectedDay, setSelectedDay] = useState<string>(daysOfWeek[0].value);
  const [selectedMealType, setSelectedMealType] = useState<string>(mealTypes[0].value);
  const [mealSearch, setMealSearch] = useState<string>('');
  const [customMeal, setCustomMeal] = useState<CustomMealForm>({
    day_of_week: daysOfWeek[0].value,
    meal_type: mealTypes[0].value,
    foodId: undefined,
    title: '',
    description: '',
    calories: undefined,
    protein_grams: undefined,
    carbs_grams: undefined,
    fats_grams: undefined,
    allergens: [],
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

  useEffect(() => {
    setCustomMeal((prev) => ({
      ...prev,
      day_of_week: selectedDay,
    }));
  }, [selectedDay]);

  useEffect(() => {
    setCustomMeal((prev) => ({
      ...prev,
      meal_type: selectedMealType,
    }));
  }, [selectedMealType]);

  const individualNutritionTotals = useMemo(
    () =>
      customMeals.reduce(
        (acc, meal) => ({
          calories: acc.calories + (meal.calories ?? 0),
          protein: acc.protein + (meal.protein_grams ?? 0),
          carbs: acc.carbs + (meal.carbs_grams ?? 0),
          fats: acc.fats + (meal.fats_grams ?? 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 },
      ),
    [customMeals],
  );

  const mealsByDay = useMemo(() => {
    const map: Record<string, Array<{ meal: CustomMealForm; index: number }>> = {};
    customMeals.forEach((meal, index) => {
      const day = meal.day_of_week || daysOfWeek[0].value;
      if (!map[day]) {
        map[day] = [];
      }
      map[day].push({ meal, index });
    });
    return map;
  }, [customMeals]);

  const selectedDayMeals = mealsByDay[selectedDay] ?? [];
  const selectedDayTotals = useMemo(
    () =>
      selectedDayMeals.reduce(
        (acc, entry) => ({
          calories: acc.calories + (entry.meal.calories ?? 0),
          protein: acc.protein + (entry.meal.protein_grams ?? 0),
          carbs: acc.carbs + (entry.meal.carbs_grams ?? 0),
          fats: acc.fats + (entry.meal.fats_grams ?? 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 },
      ),
    [selectedDayMeals],
  );

  const customPlanAllergens = useMemo(
    () => Array.from(new Set(customMeals.flatMap((meal) => meal.allergens))),
    [customMeals],
  );

  const filteredPresetMeals = useMemo(() => {
    const query = mealSearch.trim().toLowerCase();
    const matchesType = (option: FoodOption) => option.mealType === selectedMealType;
    const matchesQuery = (option: FoodOption) =>
      !query ||
      option.label.toLowerCase().includes(query) ||
      option.description.toLowerCase().includes(query);

    const preferred = individualFoodOptions.filter((option) => matchesType(option) && matchesQuery(option));
    const others = individualFoodOptions.filter((option) => !matchesType(option) && matchesQuery(option));
    return preferred.length > 0 ? preferred : others.slice(0, 8);
  }, [mealSearch, selectedMealType]);

  const handleDaySelect = (day: string) => {
    setSelectedDay(day);
    setStatusMessage(null);
  };

  const handleMealTypeSelect = (type: string) => {
    setSelectedMealType(type);
    setStatusMessage(null);
  };

  const handlePresetApply = (option: FoodOption) => {
    setSelectedMealType(option.mealType);
    setCustomMeal({
      day_of_week: selectedDay,
      meal_type: option.mealType,
      foodId: option.id,
      title: option.label,
      description: option.description,
      calories: option.calories,
      protein_grams: option.protein,
      carbs_grams: option.carbs,
      fats_grams: option.fats,
      allergens: option.allergens,
    });
    setStatusMessage(`Patiekalas „${option.label}“ parinktas. Galite pakoreguoti makro elementus prieš pridedant.`);
  };

  const resetCustomMeal = () => {
    setCustomMeal({
      day_of_week: selectedDay,
      meal_type: selectedMealType,
      foodId: undefined,
      title: '',
      description: '',
      calories: undefined,
      protein_grams: undefined,
      carbs_grams: undefined,
      fats_grams: undefined,
      allergens: [],
    });
  };

  const addMealToPlan = () => {
    setError(null);
    setStatusMessage(null);

    if (!customMeal.foodId) {
      setError('Pasirinkite patiekalą iš sąrašo prieš pridedant.');
      return;
    }

    if (customMeals.length >= 21) {
      setError('Individualų planą sudaro iki 21 įrašo. Pašalinkite nereikalingus patiekalus, kad pridėtumėte naują.');
      return;
    }

    const mealToStore: CustomMealForm = {
      ...customMeal,
      day_of_week: selectedDay,
      meal_type: selectedMealType,
      allergens: [...customMeal.allergens],
    };

    setCustomMeals((prev) => [...prev, mealToStore]);
    setStatusMessage(`„${mealToStore.title}“ pridėtas prie ${dayLabelMap[selectedDay]}.`);
    resetCustomMeal();
  };

  const removeCustomMeal = (index: number) => {
    setStatusMessage(null);
    setCustomMeals((prev) => prev.filter((_, mealIndex) => mealIndex !== index));
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

    const withinRange =
      !planConfig.calorieRange ||
      (individualNutritionTotals.calories >= planConfig.calorieRange[0] &&
        individualNutritionTotals.calories <= planConfig.calorieRange[1]);

    if (!withinRange) {
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
          allergens: meal.allergens,
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
            <span className="plan-pill">Tikslas: {planConfig.goal_type}</span>
            <span className="plan-pill">
              {planConfig.calorieRange[0]} – {planConfig.calorieRange[1]} kcal
            </span>
          </div>
        </div>
        <aside className="plan-hero__macros">
          <h3>Sukaupta santrauka</h3>
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
          <div style={{ marginTop: 16 }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Pažymėti alergenai:</span>
            <AllergenBadgeList
              allergens={customPlanAllergens}
              emptyLabel="Nepažymėta alergenų"
              size="compact"
              style={{ marginTop: 6 }}
            />
          </div>
          {!(
            individualNutritionTotals.calories >= planConfig.calorieRange[0] &&
            individualNutritionTotals.calories <= planConfig.calorieRange[1]
          ) && (
            <div className="error-banner" style={{ marginTop: 12 }}>
              Kalorijų suma turi būti tarp {planConfig.calorieRange[0]} ir {planConfig.calorieRange[1]} kcal.
            </div>
          )}
        </aside>
      </header>

      {(statusMessage || error) && (
        <div style={{ marginBottom: 16 }}>
          {statusMessage && <div className="success-banner">{statusMessage}</div>}
          {error && <div className="error-banner">{error}</div>}
        </div>
      )}

      <section className="plan-highlight">
        <h2>Kaip tai veikia?</h2>
        <ul>
          <li>Pasirinkite programos trukmę (3, 5, 7 arba 14 dienų).</li>
          <li>Pasirinkite dieną, valgio tipą ir naudokitės siūlomais patiekalais arba susikurkite savo.</li>
          <li>Stebėkite makroelementus – rodome bendrą kiekį pasirinktai dienai ir visam planui.</li>
          <li>Išsaugokite planą – jis automatiškai bus priskirtas jūsų paskyrai.</li>
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

            <div style={{ marginTop: 16 }}>
              <span style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Diena</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {daysOfWeek.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    className={`plan-duration-pill ${selectedDay === day.value ? 'plan-duration-pill--active' : ''}`}
                    onClick={() => handleDaySelect(day.value)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <span style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Valgio tipas</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {mealTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    className={`plan-duration-pill ${selectedMealType === type.value ? 'plan-duration-pill--active' : ''}`}
                    onClick={() => handleMealTypeSelect(type.value)}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <label htmlFor="meal-title">Pasirinkite patiekalą</label>
            <select
              id="meal-title"
              value={customMeal.foodId ?? ''}
              onChange={(event) => {
                const chosenId = event.target.value;
                if (!chosenId) {
                  resetCustomMeal();
                  return;
                }
                const option = individualFoodOptions.find((item) => item.id === chosenId);
                if (option) {
                  handlePresetApply(option);
                }
              }}
            >
              <option value="">– Pasirinkite –</option>
              {individualFoodOptions
                .filter((option) => option.mealType === selectedMealType)
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} · {option.mealType}
                  </option>
                ))}
            </select>

            {customMeal.description && (
              <div
                style={{
                  marginTop: 12,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'rgba(148, 163, 184, 0.12)',
                  color: '#475569',
                  fontSize: '0.9rem',
                }}
              >
                {customMeal.description}
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <span style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Makroelementai</span>
              <div
                style={{
                  display: 'grid',
                  gap: 12,
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                }}
              >
                <label htmlFor="meal-calories">
                  Kcal
                  <input
                    id="meal-calories"
                    type="number"
                    min={0}
                    value={customMeal.calories ?? ''}
                    readOnly
                    placeholder="0"
                  />
                </label>
                <label htmlFor="meal-protein">
                  Baltymai (g)
                  <input
                    id="meal-protein"
                    type="number"
                    min={0}
                    value={customMeal.protein_grams ?? ''}
                    readOnly
                    placeholder="0"
                  />
                </label>
                <label htmlFor="meal-carbs">
                  Angliavandeniai (g)
                  <input
                    id="meal-carbs"
                    type="number"
                    min={0}
                    value={customMeal.carbs_grams ?? ''}
                    readOnly
                    placeholder="0"
                  />
                </label>
                <label htmlFor="meal-fats">
                  Riebalai (g)
                  <input
                    id="meal-fats"
                    type="number"
                    min={0}
                    value={customMeal.fats_grams ?? ''}
                    readOnly
                    placeholder="0"
                  />
                </label>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <span style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Alergenai</span>
              <AllergenBadgeList
                allergens={customMeal.allergens}
                emptyLabel="Nepažymėta alergenų"
                size="compact"
              />
            </div>
            {customMeal.allergens.length === 0 && (
              <small style={{ color: '#6b7280' }}>Šis patiekalas neturi pažymėtų alergenų.</small>
            )}

            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontWeight: 600 }}>Greitos idėjos</span>
                <input
                  type="search"
                  placeholder="Ieškoti pagal pavadinimą ar ingredientus"
                  value={mealSearch}
                  onChange={(event) => setMealSearch(event.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
              <div
                style={{
                  display: 'grid',
                  gap: 12,
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                }}
              >
                {filteredPresetMeals.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    style={{
                      textAlign: 'left',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(129,140,248,0.16))',
                      padding: '14px 16px',
                      borderRadius: 16,
                      display: 'grid',
                      gap: 8,
                    }}
                    onClick={() => handlePresetApply(option)}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4338ca', textTransform: 'uppercase' }}>
                      {option.mealType}
                    </span>
                    <strong>{option.label}</strong>
                    <p style={{ fontSize: '0.9rem', lineHeight: 1.4, color: '#334155' }}>{option.description}</p>
                    <span style={{ fontSize: '0.85rem', color: '#312e81', fontWeight: 600 }}>
                      {option.calories} kcal · {option.protein} g Baltymų
                    </span>
                  </button>
                ))}
                {filteredPresetMeals.length === 0 && (
                  <div
                    style={{
                      border: '1px dashed rgba(99, 102, 241, 0.35)',
                      padding: '18px 16px',
                      borderRadius: 16,
                      fontSize: '0.9rem',
                      color: '#475569',
                    }}
                  >
                    Pagal paiešką patiekalų nerasta. Pabandykite kitą raktažodį.
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button type="button" className="primary-button" onClick={addMealToPlan}>
                Pridėti patiekalą
              </button>
              <button type="button" className="secondary-button" onClick={resetCustomMeal}>
                Išvalyti formą
              </button>
            </div>
          </div>

          <div className="plan-card plans-custom-form__summary">
            <h3>
              {dayLabelMap[selectedDay]} ({selectedDayMeals.length} patiekalai)
            </h3>
            {selectedDayMeals.length > 0 && (
              <p className="plan-card__meta">
                {selectedDayTotals.calories} kcal · {selectedDayTotals.protein} g baltymų · {selectedDayTotals.carbs}{' '}
                g angliavandenių · {selectedDayTotals.fats} g riebalų
              </p>
            )}
            {selectedDayMeals.length === 0 ? (
              <p className="plan-card__meta">Šiai dienai dar nepridėjote patiekalų.</p>
            ) : (
              <ul
                style={{
                  display: 'grid',
                  gap: 12,
                  marginTop: 12,
                }}
              >
                {selectedDayMeals.map(({ meal, index }) => (
                  <li
                    key={`${meal.day_of_week}-${meal.title}-${index}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      alignItems: 'flex-start',
                      border: '1px solid rgba(15, 118, 110, 0.25)',
                      backgroundColor: 'rgba(15, 118, 110, 0.06)',
                      borderRadius: 16,
                      padding: '12px 16px',
                    }}
                  >
                    <div>
                      <strong>{meal.meal_type}</strong>
                      <div>{meal.title}</div>
                      {meal.description && <small>{meal.description}</small>}
                      <div style={{ fontSize: '0.85rem', marginTop: 6, fontWeight: 600, color: '#0f766e' }}>
                        {meal.calories ?? 0} kcal · {meal.protein_grams ?? 0} g baltymų · {meal.carbs_grams ?? 0} g
                        angliavandenių · {meal.fats_grams ?? 0} g riebalų
                      </div>
                      <AllergenBadgeList
                        allergens={meal.allergens}
                        emptyLabel="Alergenų nėra"
                        size="compact"
                      />
                    </div>
                    <button type="button" className="secondary-button" onClick={() => removeCustomMeal(index)}>
                      Šalinti
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {customMeals.length > 0 && (
            <div className="plan-card plans-custom-form__summary">
              <h3>Visos savaitės planas</h3>
              <div
                style={{
                  display: 'grid',
                  gap: 12,
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  marginTop: 12,
                }}
              >
                {daysOfWeek.map((day) => {
                  const entries = mealsByDay[day.value] ?? [];
                  if (entries.length === 0) {
                    return (
                      <div
                        key={day.value}
                        style={{
                          border: '1px dashed rgba(148, 163, 184, 0.6)',
                          borderRadius: 14,
                          padding: '12px 14px',
                          color: '#64748b',
                          fontSize: '0.9rem',
                          backgroundColor: '#f8fafc',
                        }}
                      >
                        <strong>{day.label}</strong>
                        <span style={{ display: 'block', marginTop: 4 }}>Nėra patiekalų</span>
                      </div>
                    );
                  }
                  const totals = entries.reduce(
                    (acc, entry) => ({
                      calories: acc.calories + (entry.meal.calories ?? 0),
                      protein: acc.protein + (entry.meal.protein_grams ?? 0),
                      carbs: acc.carbs + (entry.meal.carbs_grams ?? 0),
                      fats: acc.fats + (entry.meal.fats_grams ?? 0),
                    }),
                    { calories: 0, protein: 0, carbs: 0, fats: 0 },
                  );
                  return (
                    <div
                      key={day.value}
                      style={{
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        borderRadius: 14,
                        padding: '12px 14px',
                        backgroundColor: 'rgba(59, 130, 246, 0.06)',
                      }}
                    >
                      <strong>{day.label}</strong>
                      <span style={{ display: 'block', marginTop: 4 }}>
                        {entries.length} patiekalai · {totals.calories} kcal
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Kuriama...' : 'Išsaugoti ir priskirti planą'}
          </button>
        </form>
      </section>
    </div>
  );
};

export default IndividualPlanPage;
