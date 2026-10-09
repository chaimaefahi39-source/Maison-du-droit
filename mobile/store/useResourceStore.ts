import { create } from 'zustand';
import { getResources, getCategories, type LegalResource } from '../services/resources';

type ResourceState = {
  resources: LegalResource[];
  categories: string[];
  isLoading: boolean;

  loadResources: (params?: { q?: string; category?: string }) => Promise<void>;
  loadCategories: () => Promise<void>;
};

export const useResourceStore = create<ResourceState>((set) => ({
  resources: [],
  categories: [],
  isLoading: false,

  loadResources: async (params) => {
    set({ isLoading: true });
    try {
      const data = await getResources(params);
      set({ resources: data.resources || [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  loadCategories: async () => {
    try {
      const data = await getCategories();
      set({ categories: data.categories || [] });
    } catch {
      // Ignore
    }
  },
}));
