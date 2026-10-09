import { apiClient } from '../client';

export type LegalResource = {
  id: number;
  title: string;
  category: string;
  content: string;
  url?: string;
  similarity?: number;
  createdAt: string;
};

export type GetResourcesParams = {
  q?: string;
  category?: string;
  semantic?: string;
  lang?: string;
};

export async function getResources(
  params?: GetResourcesParams
): Promise<{ success: boolean; resources: LegalResource[] }> {
  return apiClient.get('/resources', { params });
}

export async function getResourceById(
  id: number
): Promise<{ success: boolean; resource: LegalResource }> {
  return apiClient.get(`/resources/${id}`);
}

export async function getCategories(): Promise<{ success: boolean; categories: string[] }> {
  return apiClient.get('/resources/categories');
}
