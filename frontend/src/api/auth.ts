import { apiClient } from './client';
import type { LoginResponse, UserProfile } from '../types';

export interface RegisterPayload {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  goals?: string;
}

export const registerUser = async (payload: RegisterPayload): Promise<UserProfile> => {
  const { data } = await apiClient.post<UserProfile>('/auth/register', payload);
  return data;
};

export const loginUser = async (payload: { email: string; password: string }): Promise<LoginResponse> => {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
  return data;
};
