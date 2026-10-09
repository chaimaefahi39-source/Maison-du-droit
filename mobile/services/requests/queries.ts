import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { getUserRequests, getRequestById, LegalRequest } from './api';

export const requestKeys = {
  all: ['requests'] as const,
  lists: () => [...requestKeys.all, 'list'] as const,
  list: (status?: string) => [...requestKeys.lists(), status ?? 'all'] as const,
  details: () => [...requestKeys.all, 'detail'] as const,
  detail: (id: number) => [...requestKeys.details(), id] as const,
};

export function useRequestsQuery(
  status?: string,
  options?: Omit<
    UseQueryOptions<{ success: boolean; requests: LegalRequest[] }, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: requestKeys.list(status),
    queryFn: () => getUserRequests(status),
    ...options,
  });
}

export function useRequestQuery(
  id: number,
  options?: Omit<
    UseQueryOptions<{ success: boolean; request: LegalRequest }, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: requestKeys.detail(id),
    queryFn: () => getRequestById(id),
    enabled: Boolean(id) && (options?.enabled ?? true),
    ...options,
  });
}
