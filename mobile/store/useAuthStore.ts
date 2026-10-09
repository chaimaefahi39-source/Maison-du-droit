import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { UserPayload } from '../services/auth';

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

// ─── Storage Keys & Helpers ────────────────────────────────────
const TOKEN_KEY = 'mdd_token';
const USER_KEY = '@mdd_user';

const getToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
};

const setToken = async (token: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  } catch {}
};

const deleteToken = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch {}
};

// ─── Store ─────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  loadAuth: async () => {
    try {
      const [token, userJson] = await Promise.all([
        getToken(),
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
      setToken(token),
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
      deleteToken(),
      AsyncStorage.removeItem(USER_KEY),
    ]);
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },
}));
