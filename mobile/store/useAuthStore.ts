import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserPayload } from '../services/api';

// ─── Types ─────────────────────────────────────────────────────
type AuthState = {
  token: string | null;
  user: UserPayload | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  loadAuth: () => Promise<void>;
  setAuth: (token: string, user: UserPayload) => Promise<void>;
  updateUser: (user: UserPayload) => Promise<void>;
  clearAuth: () => Promise<void>;
};

// ─── Storage Keys ──────────────────────────────────────────────
const TOKEN_KEY = 'mdd_token';
const USER_KEY = '@mdd_user';

// ─── Store ─────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  loadAuth: async () => {
    try {
      const [token, userJson] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      const user: UserPayload | null = userJson ? JSON.parse(userJson) : null;
      set({ token, user, isAuthenticated: !!token, isLoading: false });
    } catch {
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setAuth: async (token: string, user: UserPayload) => {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
    ]);
    set({ token, user, isAuthenticated: true, isLoading: false });
  },

  updateUser: async (user: UserPayload) => {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },

  clearAuth: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },
}));
