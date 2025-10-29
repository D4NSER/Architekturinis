import { apiClient } from './client';

export interface DiscountCode {
  code: string;
  percent: number;
}

export const fetchDiscountCodes = async (): Promise<DiscountCode[]> => {
  const { data } = await apiClient.get<DiscountCode[]>('/discounts/codes');
  return data;
};

