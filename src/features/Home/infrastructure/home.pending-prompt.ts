type PendingPromptMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
};

export type PendingPromptHandoff = {
  jobId: string;
  sessionId: string;
  runId: string;
  startedAt: number;
  userMessage: PendingPromptMessage;
  assistantMessage: PendingPromptMessage;
};

const PENDING_PROMPT_PREFIX = 'agent-app-web.pending-prompt.';

const getPendingPromptKey = (sessionId: string) => `${PENDING_PROMPT_PREFIX}${sessionId}`;

export const savePendingPromptHandoff = (payload: PendingPromptHandoff) => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(getPendingPromptKey(payload.sessionId), JSON.stringify(payload));
};

export const getPendingPromptHandoff = (sessionId: string): PendingPromptHandoff | null => {
  if (typeof window === 'undefined') return null;

  const rawValue = window.sessionStorage.getItem(getPendingPromptKey(sessionId));
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as PendingPromptHandoff;
  } catch {
    return null;
  }
};

export const clearPendingPromptHandoff = (sessionId: string) => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(getPendingPromptKey(sessionId));
};

export const clearAllPendingPromptHandoffs = () => {
  if (typeof window === 'undefined') return;

  const keysToDelete: string[] = [];
  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);
    if (key?.startsWith(PENDING_PROMPT_PREFIX)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => window.sessionStorage.removeItem(key));
};
