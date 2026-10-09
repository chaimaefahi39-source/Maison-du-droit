import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import {
  getResources,
  getResourceById,
  getCategories,
  LegalResource,
  GetResourcesParams,
} from './api';

export const resourceKeys = {
  all: ['resources'] as const,
  lists: () => [...resourceKeys.all, 'list'] as const,
  list: (params?: GetResourcesParams) => [...resourceKeys.lists(), params ?? {}] as const,
  details: () => [...resourceKeys.all, 'detail'] as const,
  detail: (id: number) => [...resourceKeys.details(), id] as const,
  categories: () => [...resourceKeys.all, 'categories'] as const,
};

export function useResourcesQuery(
  params?: GetResourcesParams,
  options?: Omit<
    UseQueryOptions<{ success: boolean; resources: LegalResource[] }, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: resourceKeys.list(params),
    queryFn: () => getResources(params),
    ...options,
  });
}

export function useResourceByIdQuery(
  id: number,
  options?: Omit<
    UseQueryOptions<{ success: boolean; resource: LegalResource }, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: resourceKeys.detail(id),
    queryFn: () => getResourceById(id),
    enabled: Boolean(id) && (options?.enabled ?? true),
    ...options,
  });
}

export function useCategoriesQuery(
  options?: Omit<
    UseQueryOptions<{ success: boolean; categories: string[] }, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: resourceKeys.categories(),
    queryFn: getCategories,
    ...options,
  });
}
