export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  goal: string | null;
  notes: string | null;
  age: number | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Recipe {
  id: number;
  title: string;
  description: string;
  ingredients: string;
  instructions: string;
  prep_time: number;
  calories: number;
  category: string;
  created_at: string;
  average_rating?: number | null;
  total_likes?: number | null;
}

export interface RecipeDetail extends Recipe {
  comments: Comment[];
  ratings: Rating[];
  likes: Like[];
}

export interface Comment {
  id: number;
  content: string;
  user_id: number;
  recipe_id: number;
  created_at: string;
}

export interface Rating {
  id: number;
  score: number;
  user_id: number;
  recipe_id: number;
  created_at: string;
}

export interface Like {
  id: number;
  user_id: number;
  recipe_id: number;
  created_at: string;
}

export interface DietPlan {
  id: number;
  name: string;
  slug: string;
  description: string;
  summary: string;
  calories_per_day: number;
  calories_min: number | null;
  calories_max: number | null;
  meals_per_day: number | null;
  price_eur: number | null;
  lifestyle: string;
  benefits: string;
  includes: string | null;
  ideal_for: string | null;
  delivery_info: string | null;
  menu_preview: string | null;
  created_at: string;
}

export interface WeeklyMenuMeal {
  meal_type: string;
  title: string;
  description: string;
}

export interface WeeklyMenuDay {
  day: string;
  highlight: string;
  meals: WeeklyMenuMeal[];
}

export interface DietPlanProgress {
  id: number;
  plan_id: number;
  status: string;
  percent_complete: number;
  updated_at: string;
}

export interface DietPlanPurchaseDetail {
  id: number;
  plan: DietPlan;
  created_at: string;
  progress: DietPlanProgress | null;
}
