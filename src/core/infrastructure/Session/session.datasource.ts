import path from 'node:path';
import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';
import type { SessionResponse } from '@core/domain/Session/session.interface';
import type { ChatHistoryResponse } from '@core/domain/ChatHistory/chathistory.interface';
import { deriveProjectLabel, formatRelativeTime, isCodexChatWorkspace, readJsonl, readThreads, type HistoryRow, type SessionIndexRow } from '../_codex/codex-data';
import { ChatHistoryDatasource } from '../ChatHistory/chathistory.datasource';

type SessionRealtimeEvent =
  | { type: 'sidebar.refresh' }
  | { type: 'sidebar.request' }
  | { type: 'sidebar.snapshot'; data: SessionResponse.getSidebarData }
  | { type: 'session.refresh'; sessionId: string }
  | { type: 'chat.request'; sessionId: string }
  | { type: 'chat.snapshot'; sessionId: string; data: ChatHistoryResponse.getChatHistory }
  | { type: 'session.selected'; sessionId: string };

type SessionRealtimeClient = WebSocket & { isAlive?: boolean };
type SessionRealtimeHub = { wss?: WebSocketServer };
type SessionRealtimeGlobal = typeof globalThis & { __agentAppSessionRealtimeHub?: SessionRealtimeHub };

const getSessionHub = () => {
  const globalRef = globalThis as SessionRealtimeGlobal;
  if (!globalRef.__agentAppSessionRealtimeHub) {
    globalRef.__agentAppSessionRealtimeHub = {};
  }
  return globalRef.__agentAppSessionRealtimeHub;
};

const sendSessionEvent = (socket: SessionRealtimeClient, message: SessionRealtimeEvent) => {
  if (socket.readyState !== socket.OPEN) return;
  socket.send(JSON.stringify(message));
};

const buildSidebarSnapshot = async (): Promise<SessionResponse.getSidebarData> => {
  const codeHome = process.env.CODEX_HOME ?? path.join(process.env.USERPROFILE ?? '', '.codex');
  const sessionIndexPath = path.join(codeHome, 'session_index.jsonl');
  const historyPath = path.join(codeHome, 'history.jsonl');

  const [sessionRows, threadRows, historyRows] = await Promise.all([
    readJsonl<SessionIndexRow>(sessionIndexPath),
    Promise.resolve(readThreads() as { id: string; cwd?: string; title?: string; updated_at?: number }[]),
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
      };
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

export class SessionDatasource {
  notifySidebarRefresh() {
    broadcastSidebarRefresh();
  }

  notifySessionRefresh(sessionId: string) {
    broadcastSessionRefresh(sessionId);
  }

  async getSidebarData(): Promise<SessionResponse.getSidebarData> {
    return buildSidebarSnapshot();
  }
}

export const ensureSessionRealtimeServer = (server: Server) => {
  const hub = getSessionHub();
  if (hub?.wss) return hub.wss;

  const wss = new WebSocketServer({ noServer: true });
  if (hub) hub.wss = wss;

  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (request.url !== '/api/ws') return;

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (socket: SessionRealtimeClient) => {
    socket.isAlive = true;
    socket.on('pong', () => {
      socket.isAlive = true;
    });
    socket.on('message', (raw) => {
      try {
        const payload = JSON.parse(String(raw)) as Partial<SessionRealtimeEvent> | null;
        if (!payload || typeof payload.type !== 'string') return;
        if (payload.type === 'sidebar.request') {
          void buildSidebarSnapshot().then((data) => sendSessionEvent(socket, { type: 'sidebar.snapshot', data }));
          return;
        }
        if (payload.type === 'chat.request' && typeof payload.sessionId === 'string') {
          const requestedSessionId = payload.sessionId;
          void new ChatHistoryDatasource()
            .getChatHistorySnapshot({ sessionId: requestedSessionId })
            .then((data) => sendSessionEvent(socket, { type: 'chat.snapshot', sessionId: requestedSessionId, data }));
          return;
        }
        if (payload.type === 'session.selected' && typeof payload.sessionId === 'string') {
          sendSessionEvent(socket, { type: 'session.selected', sessionId: payload.sessionId });
        }
      } catch {
        return;
      }
    });
  });

  const heartbeat = setInterval(() => {
    for (const socket of wss.clients as Set<SessionRealtimeClient>) {
      if (socket.isAlive === false) {
        socket.terminate();
        continue;
      }
      socket.isAlive = false;
      socket.ping();
    }
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));
  return wss;
};

export const broadcastSidebarRefresh = () => {
  const hub = getSessionHub();
  if (!hub?.wss) return;
  for (const socket of hub.wss.clients as Set<SessionRealtimeClient>) {
    sendSessionEvent(socket, { type: 'sidebar.refresh' });
  }
};

export const broadcastSessionRefresh = (sessionId: string) => {
  const hub = getSessionHub();
  if (!hub?.wss) return;
  for (const socket of hub.wss.clients as Set<SessionRealtimeClient>) {
    sendSessionEvent(socket, { type: 'session.refresh', sessionId });
  }
};
