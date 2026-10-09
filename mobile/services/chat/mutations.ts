import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { clearChatHistory, deleteChatMessage } from './api';
import { chatKeys } from './queries';

export function useClearChatHistoryMutation(
  options?: UseMutationOptions<{ success: boolean }, Error, void>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: clearChatHistory,
    onSuccess: (...args) => {
      queryClient.setQueryData(chatKeys.history(), { success: true, messages: [] });
      queryClient.invalidateQueries({ queryKey: chatKeys.history() });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteChatMessageMutation(
  options?: UseMutationOptions<
    { success: boolean; message: string },
    Error,
    number
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (id: number) => deleteChatMessage(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.history() });
      options?.onSuccess?.(...args);
    },
  });
}
