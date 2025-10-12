export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  goals?: string;
  avatar_url?: string;
  current_plan_id?: number;
  created_at: string;
  updated_at: string;
  current_plan?: NutritionPlanSummary | null;
}

export interface LoginResponse {
  access_token: string;
  expires_at: string;
  token_type: 'bearer';
}

export interface NutritionPlanSummary {
  id: number;
  name: string;
  description: string;
  goal_type: string;
  calories?: number | null;
  protein_grams?: number | null;
  carbs_grams?: number | null;
  fats_grams?: number | null;
  is_custom: boolean;
}

export interface PlanMeal {
  id: number;
  day_of_week: string;
  meal_type: string;
  title: string;
  description?: string | null;
  calories?: number | null;
  protein_grams?: number | null;
  carbs_grams?: number | null;
  fats_grams?: number | null;
}

export interface NutritionPlanDetail extends NutritionPlanSummary {
  created_at: string;
  updated_at: string;
  meals: PlanMeal[];
}

export interface ApiError {
  detail: string;
}
