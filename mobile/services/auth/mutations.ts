import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import {
  loginUser,
  registerUser,
  updateProfile,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  AuthResponse,
  RegisterResponse,
  UserPayload,
} from './api';
import { authKeys } from './queries';

export function useLoginMutation(
  options?: UseMutationOptions<AuthResponse, Error, LoginInput>
) {
  return useMutation({
    mutationFn: (credentials: LoginInput) => loginUser(credentials),
    ...options,
  });
}

export function useRegisterMutation(
  options?: UseMutationOptions<RegisterResponse, Error, RegisterInput>
) {
  return useMutation({
    mutationFn: (data: RegisterInput) => registerUser(data),
    ...options,
  });
}

export function useUpdateProfileMutation(
  options?: UseMutationOptions<{ success: boolean; user: UserPayload }, Error, UpdateProfileInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (updates: UpdateProfileInput) => updateProfile(updates),
    onSuccess: (...args) => {
      queryClient.setQueryData(authKeys.me(), args[0]);
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      options?.onSuccess?.(...args);
    },
  });
}
