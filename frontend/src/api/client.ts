import axios from "axios";

import type {
  DietPlan,
  DietPlanProgress,
  DietPlanPurchaseDetail,
  Recipe,
  User,
} from "./types";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const apiClient = axios.create({
  baseURL,
});

apiClient.interceptors.request.use((config) => {
  const token = window.localStorage.getItem("apss_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loginRequest = async (username: string, password: string) => {
  const response = await apiClient.post("/api/auth/token", { username, password });
  return response.data;
};

export const registerRequest = async (username: string, email: string, password: string) => {
  const response = await apiClient.post("/api/auth/register", { username, email, password });
  return response.data;
};

export const fetchCurrentUser = async () => {
  const response = await apiClient.get<User>("/api/users/me");
  return response.data;
};

export const changePassword = async (payload: { current_password: string; new_password: string }) => {
  await apiClient.put("/api/users/me/password", payload);
};

export const updateProfile = async (data: Record<string, unknown>) => {
  const response = await apiClient.put("/api/users/me", data);
  return response.data;
};

export const purchasePlan = async (planId: number) => {
  const response = await apiClient.post(`/api/diet-plans/${planId}/purchase`);
  return response.data;
};

export const fetchPurchasedPlans = async () => {
  const response = await apiClient.get<DietPlan[]>("/api/diet-plans/purchased");
  return response.data;
};

export const downloadPlan = async (planId: number) => {
  const response = await apiClient.get(`/api/diet-plans/${planId}/download`, {
    responseType: "blob",
  });
  return response.data as Blob;
};

export const fetchPlanProgress = async (planId: number) => {
  const response = await apiClient.get<DietPlanProgress>(`/api/diet-plans/${planId}/progress`);
  return response.data;
};

export const updatePlanProgress = async (
  planId: number,
  payload: { status: string; percent_complete: number }
) => {
  const response = await apiClient.put<DietPlanProgress>(
    `/api/diet-plans/${planId}/progress`,
    payload
  );
  return response.data;
};

export const fetchPurchasedPlanDetails = async () => {
  const response = await apiClient.get<DietPlanPurchaseDetail[]>(
    "/api/diet-plans/purchased/detail"
  );
  return response.data;
};

export const fetchLikedRecipes = async () => {
  const response = await apiClient.get<Recipe[]>("/api/recipes/liked");
  return response.data;
};
