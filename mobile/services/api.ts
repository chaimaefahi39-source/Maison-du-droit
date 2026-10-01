import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      return `http://${window.location.hostname}:5001/api`;
    }
    return 'http://localhost:5001/api';
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5001/api';
  }
  return 'http://localhost:5001/api';
};

export const BASE_URL = getBaseUrl();

export const getStoredToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem('mdd_token');
    }
    return await SecureStore.getItemAsync('mdd_token');
  } catch (e) {
    return null;
  }
};

// ─── Axios Instance ────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor: Auto-inject Bearer token ─────────────
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // Storage may not be available
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Normalize errors ────────────────────
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Une erreur est survenue';
    return Promise.reject(new Error(message));
  }
);

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════

export type UserPayload = {
  id: number;
  fullName: string;
  email: string;
  bio?: string;
  phone?: string;
};

type AuthResponse = {
  success: boolean;
  message: string;
  token: string;
  user: UserPayload;
};

type RegisterResponse = {
  success: boolean;
  message: string;
  user: UserPayload;
};

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  return api.post('/auth/login', { email, password });
}

export async function registerUser(fullName: string, email: string, password: string): Promise<RegisterResponse> {
  return api.post('/auth/register', { fullName, email, password });
}

export async function updateProfile(updates: Partial<UserPayload>): Promise<{ success: boolean; user: UserPayload }> {
  return api.put('/auth/profile', updates);
}

export async function getMe(): Promise<{ success: boolean; user: UserPayload }> {
  return api.get('/auth/me');
}

// ═══════════════════════════════════════════════════════════════
// LEGAL REQUESTS
// ═══════════════════════════════════════════════════════════════

export type LegalRequest = {
  id: number;
  userId: number;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'processing' | 'resolved' | 'closed';
  aiResponse?: string;
  createdAt: string;
  updatedAt: string;
};

export async function createLegalRequest(data: { title: string; description: string; category?: string }): Promise<{ success: boolean; request: LegalRequest }> {
  return api.post('/requests', data);
}

export async function getUserRequests(status?: string): Promise<{ success: boolean; requests: LegalRequest[] }> {
  const params = status ? { status } : {};
  return api.get('/requests', { params });
}

export async function getRequestById(id: number): Promise<{ success: boolean; request: LegalRequest }> {
  return api.get(`/requests/${id}`);
}

// ═══════════════════════════════════════════════════════════════
// LEGAL RESOURCES
// ═══════════════════════════════════════════════════════════════

export type LegalResource = {
  id: number;
  title: string;
  category: string;
  content: string;
  url?: string;
  similarity?: number;
  createdAt: string;
};

export async function getResources(params?: { q?: string; category?: string; semantic?: string }): Promise<{ success: boolean; resources: LegalResource[] }> {
  return api.get('/resources', { params });
}

export async function getResourceById(id: number): Promise<{ success: boolean; resource: LegalResource }> {
  return api.get(`/resources/${id}`);
}

export async function getCategories(): Promise<{ success: boolean; categories: string[] }> {
  return api.get('/resources/categories');
}

// ═══════════════════════════════════════════════════════════════
// AI CHAT
// ═══════════════════════════════════════════════════════════════

export type ChatMsg = {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
};

export async function getChatHistory(): Promise<{ success: boolean; messages: ChatMsg[] }> {
  return api.get('/ai/history');
}

export async function clearChatHistory(): Promise<{ success: boolean }> {
  return api.delete('/ai/history');
}

/**
 * Helper to process complete raw SSE text line by line
 */
function parseSseLines(
  rawText: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
): boolean {
  let finished = false;
  const lines = rawText.split(/\r?\n/);
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || !trimmedLine.startsWith('data:')) continue;
    const jsonStr = trimmedLine.slice(5).trim();
    if (!jsonStr) continue;

    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.type === 'chunk' && typeof parsed.content === 'string') {
        onChunk(parsed.content);
      } else if (parsed.type === 'done') {
        onDone();
        finished = true;
        break;
      } else if (parsed.type === 'error' && parsed.message) {
        onError(parsed.message);
        finished = true;
        break;
      }
    } catch {
      // Ignore invalid or incomplete JSON lines
    }
  }
  return finished;
}

/**
 * Stream a chat message using SSE (Server-Sent Events).
 * Supports both Web (fetch + ReadableStream) and React Native Native (XMLHttpRequest + onprogress).
 * Returns a function to abort the stream.
 */
export function streamChat(
  message: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
): () => void {

  // ─── 1. Web Strategy: fetch + ReadableStream ──────────────────
  if (Platform.OS === 'web') {
    const controller = new AbortController();

    (async () => {
      try {
        const token = await getStoredToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${BASE_URL}/ai/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ message }),
          signal: controller.signal,
        });

        if (!response.ok) {
          let errorMsg = 'Erreur de connexion au serveur';
          try {
            const errJson = await response.json();
            if (errJson.message) errorMsg = errJson.message;
          } catch {}
          throw new Error(errorMsg);
        }

        if (response.body && typeof response.body.getReader === 'function') {
          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine || !trimmedLine.startsWith('data:')) continue;
              const jsonStr = trimmedLine.slice(5).trim();
              if (!jsonStr) continue;

              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.type === 'chunk' && typeof parsed.content === 'string') {
                  onChunk(parsed.content);
                } else if (parsed.type === 'done') {
                  onDone();
                  return;
                } else if (parsed.type === 'error' && parsed.message) {
                  onError(parsed.message);
                  return;
                }
              } catch {}
            }
          }

          if (buffer.trim()) {
            parseSseLines(buffer, onChunk, onDone, onError);
          } else {
            onDone();
          }
        } else {
          const text = await response.text();
          const finished = parseSseLines(text, onChunk, onDone, onError);
          if (!finished) onDone();
        }

      } catch (err: any) {
        if (err.name !== 'AbortError') {
          onError(err.message || 'Erreur inconnue');
        }
      }
    })();

    return () => controller.abort();
  }

  // ─── 2. Native Strategy (Android / iOS): XMLHttpRequest ─────────
  const xhr = new XMLHttpRequest();
  let seenIndex = 0;
  let lineBuffer = '';
  let isDoneTriggered = false;

  (async () => {
    try {
      const token = await getStoredToken();
      xhr.open('POST', `${BASE_URL}/ai/chat`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'text/event-stream');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      const processChunks = () => {
        const text = xhr.responseText || '';
        if (text.length > seenIndex) {
          const newChunk = text.slice(seenIndex);
          seenIndex = text.length;

          lineBuffer += newChunk;
          const lines = lineBuffer.split(/\r?\n/);
          lineBuffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.startsWith('data:')) continue;
            const jsonStr = trimmedLine.slice(5).trim();
            if (!jsonStr) continue;

            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.type === 'chunk' && typeof parsed.content === 'string') {
                onChunk(parsed.content);
              } else if (parsed.type === 'done') {
                if (!isDoneTriggered) {
                  isDoneTriggered = true;
                  onDone();
                }
              } else if (parsed.type === 'error' && parsed.message) {
                if (!isDoneTriggered) {
                  isDoneTriggered = true;
                  onError(parsed.message);
                }
              }
            } catch {}
          }
        }
      };

      xhr.onprogress = () => {
        processChunks();
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          processChunks();
          if (lineBuffer.trim()) {
            const trimmedLine = lineBuffer.trim();
            if (trimmedLine.startsWith('data:')) {
              const jsonStr = trimmedLine.slice(5).trim();
              if (jsonStr) {
                try {
                  const parsed = JSON.parse(jsonStr);
                  if (parsed.type === 'chunk' && typeof parsed.content === 'string') {
                    onChunk(parsed.content);
                  } else if (parsed.type === 'done') {
                    if (!isDoneTriggered) {
                      isDoneTriggered = true;
                      onDone();
                      return;
                    }
                  } else if (parsed.type === 'error' && parsed.message) {
                    if (!isDoneTriggered) {
                      isDoneTriggered = true;
                      onError(parsed.message);
                      return;
                    }
                  }
                } catch {}
              }
            }
          }
          if (!isDoneTriggered) {
            isDoneTriggered = true;
            onDone();
          }
        } else {
          if (!isDoneTriggered) {
            isDoneTriggered = true;
            let errMessage = `Erreur du serveur (${xhr.status})`;
            try {
              const parsedErr = JSON.parse(xhr.responseText);
              if (parsedErr.message) errMessage = parsedErr.message;
            } catch {}
            onError(errMessage);
          }
        }
      };

      xhr.onerror = () => {
        if (!isDoneTriggered) {
          isDoneTriggered = true;
          onError('Erreur de connexion au serveur');
        }
      };

      xhr.send(JSON.stringify({ message }));

    } catch (err: any) {
      if (!isDoneTriggered) {
        isDoneTriggered = true;
        onError(err.message || 'Erreur de connexion');
      }
    }
  })();

  return () => {
    try {
      xhr.abort();
    } catch {}
  };
}

export default api;
