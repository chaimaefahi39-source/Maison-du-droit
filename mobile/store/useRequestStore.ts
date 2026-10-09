import { create } from 'zustand';
import { getUserRequests, createLegalRequest, deleteLegalRequest, type LegalRequest } from '../services/requests';

type RequestState = {
  requests: LegalRequest[];
  isLoading: boolean;

  loadRequests: (status?: string) => Promise<void>;
  createRequest: (data: { title: string; description: string; category?: string; language?: string }) => Promise<LegalRequest>;
  deleteRequest: (id: number) => Promise<void>;
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

  deleteRequest: async (id: number) => {
    await deleteLegalRequest(id);
    set((state) => ({
      requests: state.requests.filter((r) => r.id !== id),
    }));
  },
}));
