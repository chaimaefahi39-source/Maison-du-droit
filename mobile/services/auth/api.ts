import { apiClient } from '../client';

export type UserPayload = {
  id: number;
  fullName: string;
  email: string;
  bio?: string;
  phone?: string;
};

export type AuthResponse = {
  success: boolean;
  message: string;
  token: string;
  user: UserPayload;
};

export type RegisterResponse = {
  success: boolean;
  message: string;
  user: UserPayload;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  fullName: string;
  email: string;
  password: string;
};

export type UpdateProfileInput = Partial<UserPayload>;

export async function loginUser(
  inputOrEmail: LoginInput | string,
  maybePassword?: string
): Promise<AuthResponse> {
  const payload =
    typeof inputOrEmail === 'string'
      ? { email: inputOrEmail, password: maybePassword }
      : inputOrEmail;
  return apiClient.post('/auth/login', payload);
}

export async function registerUser(
  inputOrName: RegisterInput | string,
  maybeEmail?: string,
  maybePassword?: string
): Promise<RegisterResponse> {
  const payload =
    typeof inputOrName === 'string'
      ? { fullName: inputOrName, email: maybeEmail, password: maybePassword }
      : inputOrName;
  return apiClient.post('/auth/register', payload);
}

export async function getMe(): Promise<{ success: boolean; user: UserPayload }> {
  return apiClient.get('/auth/me');
}

export async function updateProfile(
  updates: UpdateProfileInput
): Promise<{ success: boolean; user: UserPayload }> {
  return apiClient.put('/auth/profile', updates);
}
