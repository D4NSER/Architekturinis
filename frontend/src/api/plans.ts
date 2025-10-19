import { apiClient } from './client';
import type { NutritionPlanDetail, NutritionPlanSummary, RecommendedPlanDetail } from '../types';

export interface CustomPlanMealInput {
  day_of_week: string;
  meal_type: string;
  title: string;
  description?: string;
  calories?: number;
  protein_grams?: number;
  carbs_grams?: number;
  fats_grams?: number;
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
