import { apiClient } from '../client';

export type LegalRequest = {
  id: number;
  userId: number;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'processing' | 'resolved' | 'closed';
  aiResponse?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateLegalRequestInput = {
  title: string;
  description: string;
  category?: string;
  language?: string;
};

export async function getUserRequests(
  status?: string
): Promise<{ success: boolean; requests: LegalRequest[] }> {
  const params = status ? { status } : {};
  return apiClient.get('/requests', { params });
}

export async function getRequestById(
  id: number
): Promise<{ success: boolean; request: LegalRequest }> {
  return apiClient.get(`/requests/${id}`);
}

export async function createLegalRequest(
  data: CreateLegalRequestInput
): Promise<{ success: boolean; request: LegalRequest }> {
  return apiClient.post('/requests', data);
}

export async function deleteLegalRequest(
  id: number
): Promise<{ success: boolean; message: string }> {
  return apiClient.delete(`/requests/${id}`);
}
