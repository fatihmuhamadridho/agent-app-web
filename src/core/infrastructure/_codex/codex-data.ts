import fs from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type ThreadRow = {
  id: string;
  cwd?: string;
  title?: string;
  updated_at?: number;
};

export type SessionIndexRow = {
  id: string;
  title?: string;
  thread_name?: string;
  updated_at?: string;
};

export type HistoryRow = {
  session_id: string;
  ts?: number;
};

export type ThreadMetaRow = {
  rolloutPath: string;
  title: string;
  firstUserMessage: string;
};

export type RolloutMessageRow = {
  type?: string;
  payload?: {
    role?: string;
    type?: string;
    text?: string;
    message?: string;
    content?: Array<{ type?: string; text?: string; image_url?: string; url?: string }>;
    image_url?: string;
    url?: string;
  };
};

const CODEX_HOME = process.env.CODEX_HOME ?? path.join(process.env.USERPROFILE ?? '', '.codex');
const CODEX_DB_PATH = path.join(CODEX_HOME, 'state_5.sqlite');

export const formatRelativeTime = (updatedAt?: string, ts?: number) => {
  const inputDate = updatedAt ? new Date(updatedAt) : ts ? new Date(ts * 1000) : null;
  if (!inputDate || Number.isNaN(inputDate.getTime())) return '';

  const diffMs = Date.now() - inputDate.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
};

export const readJsonl = async <T,>(filePath: string): Promise<T[]> => {
  const content = await fs.readFile(filePath, 'utf8');
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
};

export const normalizePath = (value: string) => value.replace(/\\/g, '/').toLowerCase();
export const stripDevicePrefix = (value: string) => value.replace(/^\\\\\?\\/, '');

export const deriveProjectLabel = (cwd?: string) => {
  if (!cwd) return '';
  const normalized = normalizePath(cwd);
  const isProjectWorkspace =
    normalized.includes('/documents/works/') ||
    normalized.includes('/documents/personal/');

  return isProjectWorkspace ? path.basename(stripDevicePrefix(cwd)) : '';
};

export const isCodexChatWorkspace = (cwd?: string) => {
  if (!cwd) return false;
  const normalized = normalizePath(cwd);
  return normalized.includes('/documents/codex/') || normalized.endsWith('/.codex');
};

const openCodexDatabase = () => new DatabaseSync(CODEX_DB_PATH, { readOnly: true });

const withCodexDatabase = <T,>(handler: (database: DatabaseSync) => T): T | null => {
  try {
    const database = openCodexDatabase();
    try {
      return handler(database);
    } finally {
      database.close();
    }
  } catch {
    return null;
  }
};

export const readThreads = (): ThreadRow[] => {
  return (
    withCodexDatabase((database) => {
      const statement = database.prepare('SELECT id, cwd, title, updated_at FROM threads');
      return statement.all() as ThreadRow[];
    }) ?? []
  );
};

export const readThreadMeta = (sessionId: string): ThreadMetaRow => {
  return (
    withCodexDatabase((database) => {
      const row = database
        .prepare('SELECT rollout_path, title, first_user_message FROM threads WHERE id = ?')
        .get(sessionId) as { rollout_path?: string; title?: string; first_user_message?: string } | undefined;

      return {
        rolloutPath: row?.rollout_path ?? '',
        title: row?.title ?? '',
        firstUserMessage: row?.first_user_message ?? '',
      };
    }) ?? {
      rolloutPath: '',
      title: '',
      firstUserMessage: '',
    }
  );
};

export const extractContent = (content: Array<{ type?: string; text?: string }> | undefined) => {
  if (!content?.length) return '';
  return content
    .map((item) => item.text ?? '')
    .filter(Boolean)
    .join('\n')
    .trim();
};

export const extractImages = (content: Array<{ type?: string; image_url?: string; url?: string }> | undefined) => {
  if (!content?.length) return [];

  return content
    .map((item) => item.image_url ?? item.url ?? '')
    .filter((value): value is string => Boolean(value));
};

export const sanitizePromptText = (value: string) =>
  value
    .replace(/<environment_context>[\s\S]*?<\/environment_context>/gi, '')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\n{3,}/g, '\n\n');
