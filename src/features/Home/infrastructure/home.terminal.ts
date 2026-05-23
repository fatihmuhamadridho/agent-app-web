import { useEffect, useMemo, useState } from 'react';

export type TerminalRunStatus = 'idle' | 'running' | 'completed' | 'failed';

export type TerminalHistoryEntry = {
  id: string;
  command: string;
  output: string;
  status: Exclude<TerminalRunStatus, 'idle'>;
  exitCode: number | null;
  errorMessage: string | null;
  createdAt: number;
};

const TERMINAL_HISTORY_STORAGE_KEY = 'agent-app-web.terminal-history';
const TERMINAL_OPEN_STORAGE_KEY = 'agent-app-web.terminal-open';

const isBrowser = () => typeof window !== 'undefined';

const readJson = <T,>(key: string, fallback: T): T => {
  if (!isBrowser()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const writeString = (key: string, value: string) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, value);
};

export const useTerminalOpenState = () => {
  const [isOpen, setIsOpen] = useState(() => {
    if (!isBrowser()) return false;
    return window.localStorage.getItem(TERMINAL_OPEN_STORAGE_KEY) === 'true';
  });

  const setTerminalOpen = (nextValue: boolean) => {
    setIsOpen(nextValue);
    writeString(TERMINAL_OPEN_STORAGE_KEY, String(nextValue));
  };

  return [isOpen, setTerminalOpen] as const;
};

export const useTerminalHistory = (sessionId?: string) => {
  const storageKey = useMemo(() => `${TERMINAL_HISTORY_STORAGE_KEY}:${sessionId ?? 'workspace'}`, [sessionId]);
  const [history, setHistory] = useState<TerminalHistoryEntry[]>(() => readJson<TerminalHistoryEntry[]>(storageKey, []));

  useEffect(() => {
    const next = readJson<TerminalHistoryEntry[]>(storageKey, []);
    window.setTimeout(() => {
      setHistory(next);
    }, 0);
  }, [storageKey]);

  const persistHistory = (updater: (current: TerminalHistoryEntry[]) => TerminalHistoryEntry[]) => {
    setHistory((current) => {
      const next = updater(current);
      writeJson(storageKey, next);
      return next;
    });
  };

  const clearHistory = () => {
    persistHistory(() => []);
  };

  return { history, setHistory, persistHistory, clearHistory, storageKey } as const;
};
