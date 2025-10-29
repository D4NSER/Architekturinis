import { apiClient } from './client';
import type { PurchaseDetail, PurchaseSummary } from '../types';

export const fetchPurchases = async (): Promise<PurchaseSummary[]> => {
  const { data } = await apiClient.get<PurchaseSummary[]>('/purchases');
  return data;
};

export const fetchPurchaseDetail = async (purchaseId: number): Promise<PurchaseDetail> => {
  const { data } = await apiClient.get<PurchaseDetail>(`/purchases/${purchaseId}`);
  return data;
};

export const downloadPurchaseReceipt = async (purchaseId: number): Promise<Blob> => {
  const { data } = await apiClient.get<Blob>(`/purchases/${purchaseId}/receipt`, {
    responseType: 'blob',
  });
  return data;
};

export const cancelPurchase = async (purchaseId: number): Promise<PurchaseSummary> => {
  const { data } = await apiClient.post<PurchaseSummary>(`/purchases/${purchaseId}/cancel`, {});
  return data;
};
