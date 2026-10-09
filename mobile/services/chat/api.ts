import { Platform } from 'react-native';
import { apiClient, BASE_URL, getStoredToken } from '../client';

export type ChatMsg = {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
};

export async function getChatHistory(): Promise<{ success: boolean; messages: ChatMsg[] }> {
  return apiClient.get('/ai/history');
}

export async function clearChatHistory(): Promise<{ success: boolean }> {
  return apiClient.delete('/ai/history');
}

export async function deleteChatMessage(
  id: number
): Promise<{ success: boolean; message: string }> {
  return apiClient.delete(`/ai/messages/${id}`);
}

/**
 * Helper to process complete raw SSE text line by line
 */
function parseSseLines(
  rawText: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void
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
  language: string = 'fr'
): () => void {
  // ─── 1. Web Strategy: fetch + ReadableStream ──────────────────
  if (Platform.OS === 'web') {
    const controller = new AbortController();

    (async () => {
      try {
        const token = await getStoredToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          'Accept-Language': language,
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${BASE_URL}/ai/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ message, language }),
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
      xhr.setRequestHeader('Accept-Language', language);
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

      xhr.send(JSON.stringify({ message, language }));
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
