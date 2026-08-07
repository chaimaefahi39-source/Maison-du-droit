import { create } from 'zustand';
import { getUserRequests, createLegalRequest, type LegalRequest } from '../services/api';

type RequestState = {
  requests: LegalRequest[];
  isLoading: boolean;

  loadRequests: (status?: string) => Promise<void>;
  createRequest: (data: { title: string; description: string; category?: string }) => Promise<LegalRequest>;
};

export const useRequestStore = create<RequestState>((set) => ({
  requests: [],
  isLoading: false,

  loadRequests: async (status?: string) => {
    set({ isLoading: true });
    try {
      const data = await getUserRequests(status);
      set({ requests: data.requests || [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createRequest: async (data) => {
    const result = await createLegalRequest(data);
    set((state) => ({
      requests: [result.request, ...state.requests],
    }));
    return result.request;
  },
}));
