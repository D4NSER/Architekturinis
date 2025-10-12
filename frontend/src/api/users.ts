import { apiClient } from './client';
import type { UserProfile } from '../types';

export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  goals?: string;
}

export const fetchCurrentUser = async (): Promise<UserProfile> => {
  const { data } = await apiClient.get<UserProfile>('/users/me');
  return data;
};

export const updateProfile = async (payload: UpdateProfilePayload): Promise<UserProfile> => {
  const { data } = await apiClient.put<UserProfile>('/users/me', payload);
  return data;
};

export const uploadAvatar = async (file: File): Promise<UserProfile> => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post<UserProfile>('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
};
