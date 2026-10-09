import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { getChatHistory, ChatMsg } from './api';

export const chatKeys = {
  all: ['chat'] as const,
  history: () => [...chatKeys.all, 'history'] as const,
};

export function useChatHistoryQuery(
  options?: Omit<
    UseQueryOptions<{ success: boolean; messages: ChatMsg[] }, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: chatKeys.history(),
    queryFn: getChatHistory,
    ...options,
  });
}
