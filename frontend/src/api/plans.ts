import { apiClient } from './client';
import type {
  AllergenId,
  NutritionPlanDetail,
  NutritionPlanSummary,
  RecommendedPlanDetail,
} from '../types';

export interface CustomPlanMealInput {
  day_of_week: string;
  meal_type: string;
  title: string;
  description?: string;
  calories?: number;
  protein_grams?: number;
  carbs_grams?: number;
  fats_grams?: number;
  allergens?: AllergenId[];
}

export interface CustomPlanPayload {
  name: string;
  description: string;
  meals: CustomPlanMealInput[];
}

export const fetchPlans = async (): Promise<NutritionPlanSummary[]> => {
  const { data } = await apiClient.get<NutritionPlanSummary[]>('/plans');
  return data;
};

export const fetchRecommendedPlan = async (): Promise<RecommendedPlanDetail> => {
  const { data } = await apiClient.get<RecommendedPlanDetail>('/plans/recommended');
  return data;
};

export const createCustomPlan = async (payload: CustomPlanPayload): Promise<NutritionPlanDetail> => {
  const { data } = await apiClient.post<NutritionPlanDetail>('/plans/custom', payload);
  return data;
};

export const selectPlan = async (planId: number): Promise<NutritionPlanSummary> => {
  const { data } = await apiClient.post<NutritionPlanSummary>('/plans/select', { plan_id: planId });
  return data;
};

export const fetchPlanDetail = async (planId: number): Promise<NutritionPlanDetail> => {
  const { data } = await apiClient.get<NutritionPlanDetail>(`/plans/${planId}`);
  return data;
};

export interface PlanCheckoutPayload {
  period_days: number;
  payment_method: 'card' | 'bank_transfer' | 'cash';
  buyer_full_name: string;
  buyer_email: string;
  buyer_phone?: string;
  discount_code?: string;
  card_number?: string;
  card_exp_month?: string;
  card_exp_year?: string;
  card_cvc?: string;
  invoice_needed?: boolean;
  company_name?: string;
  company_code?: string;
  vat_code?: string;
  extra_notes?: string;
}

export interface PlanCheckoutResponse {
  purchase_id: number;
  plan_id: number;
  status: string;
  base_price: number;
  total_price: number;
  discount_amount: number;
  discount_label?: string | null;
  discount_code?: string | null;
  discount_percent?: number | null;
  currency: string;
  download_url?: string | null;
}

export const checkoutPlan = async (
  planId: number,
  payload: PlanCheckoutPayload,
): Promise<PlanCheckoutResponse> => {
  const { data } = await apiClient.post<PlanCheckoutResponse>(`/plans/${planId}/checkout`, payload);
  return data;
};
