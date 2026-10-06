import { create } from 'zustand';
import { getChatHistory, clearChatHistory, deleteChatMessage, streamChat, type ChatMsg } from '../services/api';

type ChatState = {
  messages: ChatMsg[];
  isStreaming: boolean;
  isLoading: boolean;
  abortFn: (() => void) | null;

  // Actions
  loadHistory: () => Promise<void>;
  sendMessage: (text: string, language?: string) => void;
  clearHistory: () => Promise<void>;
  deleteMessage: (id?: number, index?: number) => Promise<void>;
  stopStreaming: () => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  isLoading: false,
  abortFn: null,

  loadHistory: async () => {
    set({ isLoading: true });
    try {
      const data = await getChatHistory();
      set({ messages: data.messages || [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  sendMessage: (text: string, language: string = 'fr') => {
    const userMsg: ChatMsg = { role: 'user', content: text };

    set((state) => ({
      messages: [...state.messages, userMsg],
      isStreaming: true,
    }));

    // Create a placeholder assistant message that we'll append to
    const assistantMsg: ChatMsg = { role: 'assistant', content: '' };
    set((state) => ({
      messages: [...state.messages, assistantMsg],
    }));

    const abort = streamChat(
      text,
      // onChunk
      (chunk: string) => {
        set((state) => {
          const msgs = [...state.messages];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            msgs[msgs.length - 1] = { ...lastMsg, content: lastMsg.content + chunk };
          }
          return { messages: msgs };
        });
      },
      // onDone
      () => {
        set({ isStreaming: false, abortFn: null });
        get().loadHistory();
      },
      // onError
      (error: string) => {
        set((state) => {
          const msgs = [...state.messages];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.content) {
            msgs[msgs.length - 1] = { ...lastMsg, content: `⚠️ Erreur: ${error}` };
          }
          return { messages: msgs, isStreaming: false, abortFn: null };
        });
      },
      language
    );

    set({ abortFn: abort });
  },

  clearHistory: async () => {
    try {
      await clearChatHistory();
      set({ messages: [] });
    } catch {
      // Ignore
    }
  },

  deleteMessage: async (id?: number, index?: number) => {
    if (id) {
      try {
        await deleteChatMessage(id);
      } catch (e) {
        console.warn('Failed to delete message from DB:', e);
      }
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== id),
      }));
    } else if (typeof index === 'number') {
      set((state) => ({
        messages: state.messages.filter((_, i) => i !== index),
      }));
    }
  },

  stopStreaming: () => {
    const { abortFn } = get();
    if (abortFn) abortFn();
    set({ isStreaming: false, abortFn: null });
  },
}));
