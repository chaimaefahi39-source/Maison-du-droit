import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import {
  createLegalRequest,
  deleteLegalRequest,
  CreateLegalRequestInput,
  LegalRequest,
} from './api';
import { requestKeys } from './queries';

export function useCreateRequestMutation(
  options?: UseMutationOptions<
    { success: boolean; request: LegalRequest },
    Error,
    CreateLegalRequestInput
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (data: CreateLegalRequestInput) => createLegalRequest(data),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.all });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteRequestMutation(
  options?: UseMutationOptions<
    { success: boolean; message: string },
    Error,
    number
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (id: number) => deleteLegalRequest(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.all });
      options?.onSuccess?.(...args);
    },
  });
}
