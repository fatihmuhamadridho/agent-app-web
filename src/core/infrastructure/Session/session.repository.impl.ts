import path from 'node:path';
import type { SessionResponse } from '@core/domain/Session/session.interface';
import { SessionRepository } from '@core/domain/Session/session.repository';
import {
  deriveProjectLabel,
  formatRelativeTime,
  isCodexChatWorkspace,
  readJsonl,
  readThreads,
  type HistoryRow,
  type SessionIndexRow,
} from '../_codex/codex-data';

type ThreadRow = {
  id: string;
  cwd?: string;
  title?: string;
  updated_at?: number;
};

type SidebarSession = {
  id: string;
  label: string;
  updatedAt: number;
  time: string;
  projectLabel: string;
};

const getSidebarData = async (): Promise<SessionResponse.getSidebarData> => {
  const codeHome = process.env.CODEX_HOME ?? path.join(process.env.USERPROFILE ?? '', '.codex');
  const sessionIndexPath = path.join(codeHome, 'session_index.jsonl');
  const historyPath = path.join(codeHome, 'history.jsonl');

  const [sessionRows, threadRows, historyRows] = await Promise.all([
    readJsonl<SessionIndexRow>(sessionIndexPath),
    Promise.resolve(readThreads() as ThreadRow[]),
    readJsonl<HistoryRow>(historyPath),
  ]);

  const historyBySession = new Map<string, number>();
  for (const row of historyRows) {
    const current = historyBySession.get(row.session_id) ?? 0;
    historyBySession.set(row.session_id, Math.max(current, row.ts ?? 0));
  }

  const threadMap = new Map(threadRows.map((row) => [row.id, row]));
  const sortedSessions = [...sessionRows]
    .map((row) => {
      const thread = threadMap.get(row.id);
      const updatedAt = thread?.updated_at ?? (row.updated_at ? new Date(row.updated_at).getTime() / 1000 : 0);

      return {
        id: row.id,
        label: row.title ?? row.thread_name ?? thread?.title ?? row.id,
        updatedAt,
        projectLabel: deriveProjectLabel(thread?.cwd),
        time: formatRelativeTime(row.updated_at, historyBySession.get(row.id)),
      } satisfies SidebarSession;
    })
    .sort((left, right) => right.updatedAt - left.updatedAt);

  const projectGroupMap = new Map<string, SessionResponse.getSidebarData['projectGroups'][number]>();
  const chats: SessionResponse.getSidebarData['chats'] = [];

  for (const session of sortedSessions) {
    if (session.projectLabel) {
      const existing = projectGroupMap.get(session.projectLabel);
      const nextSession = {
        id: session.id,
        label: session.label,
        time: session.time,
        active: false,
      };

      if (existing) {
        existing.sessions.push(nextSession);
      } else {
        projectGroupMap.set(session.projectLabel, {
          id: session.projectLabel,
          label: session.projectLabel,
          sessions: [nextSession],
        });
      }
    } else if (isCodexChatWorkspace(threadMap.get(session.id)?.cwd)) {
      chats.push({
        id: session.id,
        label: session.label,
        time: session.time,
        active: false,
      });
    }
  }

  return {
    projectGroups: [...projectGroupMap.values()],
    chats: chats.slice(0, 4),
  };
};

export class SessionRepositoryImpl extends SessionRepository {
  async getSidebarData(): Promise<SessionResponse.getSidebarData> {
    return getSidebarData();
  }
}
