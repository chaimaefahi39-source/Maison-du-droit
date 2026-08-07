import { create } from 'zustand';
import { getChatHistory, clearChatHistory, streamChat, type ChatMsg } from '../services/api';

type ChatState = {
  messages: ChatMsg[];
  isStreaming: boolean;
  isLoading: boolean;
  abortFn: (() => void) | null;

  // Actions
  loadHistory: () => Promise<void>;
  sendMessage: (text: string) => void;
  clearHistory: () => Promise<void>;
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

  sendMessage: (text: string) => {
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
      }
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

  stopStreaming: () => {
    const { abortFn } = get();
    if (abortFn) abortFn();
    set({ isStreaming: false, abortFn: null });
  },
}));
