import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { getMe, UserPayload } from './api';

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

export function useCurrentUserQuery(
  options?: Omit<UseQueryOptions<{ success: boolean; user: UserPayload }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: getMe,
    ...options,
  });
}
