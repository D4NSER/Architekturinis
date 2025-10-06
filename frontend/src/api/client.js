import axios from "axios";
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
export const loginRequest = async (username, password) => {
    const response = await apiClient.post("/api/auth/token", { username, password });
    return response.data;
};
export const registerRequest = async (username, email, password) => {
    const response = await apiClient.post("/api/auth/register", { username, email, password });
    return response.data;
};
export const fetchCurrentUser = async () => {
    const response = await apiClient.get("/api/users/me");
    return response.data;
};
export const changePassword = async (payload) => {
    await apiClient.put("/api/users/me/password", payload);
};
export const updateProfile = async (data) => {
    const response = await apiClient.put("/api/users/me", data);
    return response.data;
};
export const purchasePlan = async (planId) => {
    const response = await apiClient.post(`/api/diet-plans/${planId}/purchase`);
    return response.data;
};
export const fetchPurchasedPlans = async () => {
    const response = await apiClient.get("/api/diet-plans/purchased");
    return response.data;
};
export const downloadPlan = async (planId) => {
    const response = await apiClient.get(`/api/diet-plans/${planId}/download`, {
        responseType: "blob",
    });
    return response.data;
};
export const fetchPlanProgress = async (planId) => {
    const response = await apiClient.get(`/api/diet-plans/${planId}/progress`);
    return response.data;
};
export const updatePlanProgress = async (planId, payload) => {
    const response = await apiClient.put(`/api/diet-plans/${planId}/progress`, payload);
    return response.data;
};
export const fetchPurchasedPlanDetails = async () => {
    const response = await apiClient.get("/api/diet-plans/purchased/detail");
    return response.data;
};
export const fetchLikedRecipes = async () => {
    const response = await apiClient.get("/api/recipes/liked");
    return response.data;
};
