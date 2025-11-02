export type AllergenId =
  | 'gluten'
  | 'milk'
  | 'egg'
  | 'peanut'
  | 'tree_nut'
  | 'soy'
  | 'fish'
  | 'shellfish'
  | 'sesame'
  | 'mustard'
  | 'celery'
  | 'sulfites'
  | 'lupin';

export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  goal: string;
  height_cm?: number;
  weight_kg?: number;
  activity_level?: string;
  dietary_preferences?: string;
  allergies: AllergenId[];
  birth_date?: string | null;
  avatar_url?: string;
  current_plan_id?: number;
  created_at: string;
  updated_at: string;
  current_plan?: NutritionPlanSummary | null;
  purchase_count: number;
  eligible_first_purchase_discount: boolean;
  plan_progress?: PlanProgress | null;
  plan_surveys?: PlanProgressSurvey[];
  plan_completed_surveys?: PlanSurveyHistoryEntry[];
}

export interface LoginResponse {
  access_token: string;
  expires_at: string;
  token_type: 'bearer';
}

export interface AppliedDiscount {
  code?: string;
  label?: string;
  amount?: number;
  percent?: number;
}

export interface PlanPricingOption {
  period_days: number;
  base_price: number;
  final_price: number;
  currency: string;
  discounts_applied: AppliedDiscount[];
}

export interface PurchaseMealSnapshot {
  id: number;
  day_of_week: string;
  meal_type: string;
  meal_title: string;
  meal_description?: string | null;
  calories?: number | null;
  protein_grams?: number | null;
  carbs_grams?: number | null;
  fats_grams?: number | null;
}

export interface PurchaseSummary {
  id: number;
  plan_id: number;
  plan_name_snapshot: string;
  period_days: number;
  base_price: number;
  total_price: number;
  discount_amount: number;
  discount_label?: string | null;
  discount_code?: string | null;
  discount_percent?: number | null;
  currency: string;
  status: string;
  payment_method: string;
  created_at: string;
  paid_at?: string | null;
  transaction_reference?: string | null;
  download_url?: string | null;
}

export interface PurchaseDetail extends PurchaseSummary {
  buyer_full_name: string;
  buyer_email: string;
  buyer_phone?: string | null;
  invoice_needed: boolean;
  company_name?: string | null;
  company_code?: string | null;
  vat_code?: string | null;
  extra_notes?: string | null;
  items: PurchaseMealSnapshot[];
}

export interface NutritionPlanSummary {
  id: number;
  name: string;
  description: string;
  goal_type: string;
  allergens: AllergenId[];
  calories?: number | null;
  protein_grams?: number | null;
  carbs_grams?: number | null;
  fats_grams?: number | null;
  is_custom: boolean;
  pricing_options: PlanPricingOption[];
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
  allergens: AllergenId[];
}

export interface NutritionPlanDetail extends NutritionPlanSummary {
  created_at: string;
  updated_at: string;
  meals: PlanMeal[];
}

export interface RecommendedPlanDetail extends NutritionPlanDetail {
  recommendation_reason?: string | null;
}

export interface ApiError {
  detail: string;
}

export interface PlanProgress {
  plan_id: number;
  plan_name: string;
  started_at: string;
  expected_finish_at: string;
  total_days: number;
  completed_days: number;
  remaining_days: number;
  percent: number;
  is_expired: boolean;
}

export interface PlanProgressSurvey {
  id: number;
  plan_id: number;
  plan_name_snapshot: string;
  survey_type: 'progress' | 'final';
  day_offset: number;
  scheduled_at: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  completed_at?: string | null;
  cancelled_at?: string | null;
  response_submitted: boolean;
}

export interface SurveyAnswerSummary {
  question_id: string;
  prompt: string;
  answer: number | string | string[];
}

export interface PlanSurveyHistoryEntry {
  id: number;
  response_id?: number | null;
  plan_id: number;
  plan_name_snapshot: string;
  survey_type: 'progress' | 'final';
  day_offset: number;
  scheduled_at: string;
  completed_at?: string | null;
  submitted_at?: string | null;
  answers: SurveyAnswerSummary[];
}
