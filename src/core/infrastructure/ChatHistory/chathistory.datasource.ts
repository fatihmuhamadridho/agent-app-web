import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import type {
  ChatHistoryMessageProps,
  ChatHistoryRunCommandProps,
  ChatHistoryRunFileProps,
  ChatHistoryRunProps,
  ChatHistoryRunStepProps,
} from '@core/domain/ChatHistory/chathistory.interface';
import {
  extractContent,
  extractImages,
  readThreadMeta,
  sanitizePromptText,
  type RolloutMessageRow,
} from '../_codex/codex-data';

type ChatHistoryRecord = {
  title?: string;
  messages: ChatHistoryMessageProps[];
  runs: ChatHistoryRunProps[];
};

type ChatHistoryGlobal = typeof globalThis & {
  __agentAppChatHistoryStore?: Map<string, ChatHistoryRecord>;
};

const CODEX_HOME = process.env.CODEX_HOME ?? path.join(process.env.USERPROFILE ?? '', '.codex');
const HISTORY_STORE_DIR = path.join(CODEX_HOME, 'agent-app-web', 'chat-history');
const CODEX_SESSIONS_DIR = path.join(CODEX_HOME, 'sessions');

const getStore = () => {
  const globalRef = globalThis as ChatHistoryGlobal;
  if (!globalRef.__agentAppChatHistoryStore) {
    globalRef.__agentAppChatHistoryStore = new Map<string, ChatHistoryRecord>();
  }

  return globalRef.__agentAppChatHistoryStore;
};

const getStoreFilePath = (sessionId: string) => path.join(HISTORY_STORE_DIR, `${sessionId}.json`);

const ensureStoreDirectory = () => {
  fs.mkdirSync(HISTORY_STORE_DIR, { recursive: true });
};

const loadPersistedRecord = (sessionId: string): ChatHistoryRecord | null => {
  try {
    const raw = fs.readFileSync(getStoreFilePath(sessionId), 'utf8');
    return JSON.parse(raw) as ChatHistoryRecord;
  } catch {
    return null;
  }
};

const persistRecord = (sessionId: string, record: ChatHistoryRecord) => {
  ensureStoreDirectory();
  fs.writeFileSync(getStoreFilePath(sessionId), JSON.stringify(record, null, 2), 'utf8');
};

const getSessionRecord = (sessionId: string) => {
  const store = getStore();
  let record = store.get(sessionId);
  if (!record) {
    record = loadPersistedRecord(sessionId) ?? {
      messages: [],
      runs: [],
    };
    store.set(sessionId, record);
  }

  return record;
};

const appendUnique = <T extends { id: string }>(items: T[], item: T) => {
  const existingIndex = items.findIndex((entry) => entry.id === item.id);
  if (existingIndex >= 0) {
    items[existingIndex] = item;
    return items;
  }

  items.push(item);
  return items;
};

const commitRecord = (sessionId: string, record: ChatHistoryRecord) => {
  const store = getStore();
  store.set(sessionId, record);
  persistRecord(sessionId, record);
};

const getRun = (record: ChatHistoryRecord, runId: string) => {
  let run = record.runs.find((entry) => entry.id === runId);
  if (!run) {
    run = {
      id: runId,
      anchorMessageId: undefined,
      status: 'running',
      startedAt: Date.now(),
      endedAt: null,
      steps: [],
      commands: [],
      files: [],
      assistantMessages: [],
    };
    record.runs.push(run);
  }

  return run;
};

const assignRunAnchors = (messages: ChatHistoryMessageProps[], runs: ChatHistoryRunProps[]) => {
  const userMessageIds = messages.filter((message) => message.role === 'user').map((message) => message.id);
  const usedMessageIds = new Set<string>();

  runs.forEach((run) => {
    const existingAnchorId = run.anchorMessageId?.trim();
    if (existingAnchorId && userMessageIds.includes(existingAnchorId) && !usedMessageIds.has(existingAnchorId)) {
      usedMessageIds.add(existingAnchorId);
      return;
    }

    const nextAnchorId = userMessageIds.find((messageId) => !usedMessageIds.has(messageId));
    if (!nextAnchorId) return;

    run.anchorMessageId = nextAnchorId;
    usedMessageIds.add(nextAnchorId);
  });
};

const buildRunAssistantMessageId = (runId: string) => `${runId}-assistant`;
const buildRunUserMessageId = (runId: string) => `${runId}-user`;

const parseRolloutMessages = async (sessionId: string) => {
  const { rolloutPath, title, firstUserMessage } = readThreadMeta(sessionId);
  if (!rolloutPath) {
    return {
      title: title || firstUserMessage || sessionId,
      messages: [] as ChatHistoryMessageProps[],
    };
  }

  const rolloutRows = await fsp.readFile(rolloutPath, 'utf8');
  const messages = rolloutRows
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const row = JSON.parse(line) as RolloutMessageRow;
      const role =
        row.payload?.role === 'user' || row.payload?.role === 'assistant' || row.payload?.role === 'system'
          ? row.payload.role
          : null;
      const images = extractImages(row.payload?.content);
      const content = sanitizePromptText(row.payload?.text ?? row.payload?.message ?? extractContent(row.payload?.content));
      const normalizedContent = images.length
        ? content
            .replace(/^\s*<image>\s*$/gim, '')
            .replace(/^\s*<\/image>\s*$/gim, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim()
        : content;
      return role && (normalizedContent || images.length)
        ? {
            id: `${sessionId}-${index}`,
            role,
            content: normalizedContent,
            ...(images.length ? { images } : {}),
          }
        : null;
    })
    .filter((message): message is ChatHistoryMessageProps => Boolean(message));

  const persistedRecord = loadPersistedRecord(sessionId) ?? getStore().get(sessionId);

  return {
    title: title || firstUserMessage || sessionId,
    messages,
    runs: persistedRecord?.runs ?? [],
  };
};

const walkJsonlFiles = async (directory: string): Promise<string[]> => {
  const entries = await fsp.readdir(directory, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkJsonlFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      files.push(fullPath);
    }
  }

  return files;
};

type TranscriptEvent = {
  event: string;
  data: Record<string, unknown>;
};

type CodexSessionLine = {
  type?: string;
  payload?: {
    type?: string;
    role?: 'user' | 'assistant' | 'system';
    name?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  };
};

const parseTranscriptEvents = (content: string) => {
  const events: TranscriptEvent[] = [];
  const lines = content.split(/\r?\n/);
  let currentEvent = '';
  let currentData = '';

  const flush = () => {
    if (!currentEvent || !currentData) return;
    try {
      events.push({
        event: currentEvent,
        data: JSON.parse(currentData) as Record<string, unknown>,
      });
    } catch {
      // Ignore malformed transcript fragments.
    }
    currentEvent = '';
    currentData = '';
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }

    if (line.startsWith('event: ')) {
      flush();
      currentEvent = line.slice('event: '.length).trim();
      continue;
    }

    if (line.startsWith('data: ')) {
      currentData = line.slice('data: '.length).trim();
      continue;
    }
  }

  flush();
  return events;
};

const extractRunsFromLogs = async (sessionId: string): Promise<ChatHistoryRunProps[]> => {
  const files = await walkJsonlFiles(CODEX_SESSIONS_DIR);
  const runs = new Map<string, ChatHistoryRunProps>();

  for (const filePath of files) {
    const content = await fsp.readFile(filePath, 'utf8').catch(() => '');
    if (!content.includes(sessionId)) continue;
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as CodexSessionLine;
        } catch {
          return null;
        }
      })
      .filter((line): line is CodexSessionLine => Boolean(line));

    const transcriptEvents: TranscriptEvent[] = [];
    for (const line of lines) {
      const text = line.payload?.content?.map((item) => item.text ?? '').join('\n') ?? '';
      if (!text.includes('event: ')) continue;
      transcriptEvents.push(...parseTranscriptEvents(text));
    }

    if (transcriptEvents.length) {
      for (const event of transcriptEvents) {
        const eventSessionId = String(event.data.sessionId ?? sessionId);
        const runId = String(event.data.jobId ?? event.data.runId ?? 'unknown-run');
        const timestamp = Date.now();
        let run = runs.get(runId);

        if (!run) {
          run = {
            id: runId,
            anchorMessageId: undefined,
            status: 'running',
            startedAt: timestamp,
            endedAt: null,
            steps: [],
            commands: [],
            files: [],
            assistantMessages: [],
          };
          runs.set(runId, run);
        }

        const pushStep = (type: ChatHistoryRunStepProps['type'], label: string, detail?: string) => {
          appendUnique(run.steps, {
            id: `${runId}-${type}-${run.steps.length + 1}`,
            type,
            label,
            detail,
            timestamp,
          });
        };

        if (event.event === 'run.started') {
          run.startedAt = timestamp;
          pushStep('run.started', 'Run started', eventSessionId);
          continue;
        }

        if (event.event === 'turn.started') {
          pushStep('turn.started', 'Turn started', 'assistant is processing the prompt');
          continue;
        }

        if (event.event === 'item.started' || event.event === 'item.updated' || event.event === 'item.completed') {
          const itemType = String((event.data.item as { type?: string } | undefined)?.type ?? 'unknown');
          pushStep(
            event.event,
            itemType === 'command_execution'
              ? event.event === 'item.started'
                ? 'Command started'
                : event.event === 'item.completed'
                  ? 'Command completed'
                  : 'Command updated'
              : itemType === 'file_change'
                ? event.event === 'item.started'
                  ? 'File change started'
                  : event.event === 'item.completed'
                    ? 'File change completed'
                    : 'File change updated'
                : event.event === 'item.started'
                  ? 'Item started'
                  : event.event === 'item.completed'
                    ? 'Item completed'
                    : 'Item updated',
            itemType
          );
          continue;
        }

        if (event.event === 'tool.command.started' || event.event === 'tool.command.completed') {
          const command = String(event.data.command ?? '');
          appendUnique(run.commands, {
            id: `${runId}-command-${run.commands.length + 1}`,
            command,
            status: event.event === 'tool.command.completed' ? String(event.data.status ?? 'completed') as ChatHistoryRunCommandProps['status'] : 'in_progress',
            output: event.event === 'tool.command.completed' ? String(event.data.output ?? '') || undefined : undefined,
            exitCode: typeof event.data.exitCode === 'number' ? event.data.exitCode : undefined,
            timestamp,
          });
          continue;
        }

        if (event.event === 'file.created' || event.event === 'file.updated') {
          const pathValue = String(event.data.path ?? '');
          appendUnique(run.files, {
            id: `${runId}-file-${run.files.length + 1}`,
            path: pathValue,
            kind: event.event as ChatHistoryRunFileProps['kind'],
            status: event.event === 'file.created' ? 'created' : 'updated',
            timestamp,
          });
          continue;
        }

        if (event.event === 'chat.update') {
          const contentValue = String(event.data.text ?? '');
          const messageId = `${runId}-assistant-${run.assistantMessages.length + 1}`;
          appendUnique(run.assistantMessages, {
            id: messageId,
            content: contentValue,
            timestamp,
          });
          run.anchorMessageId ||= messageId;
          pushStep('chat.update', 'Chat updated', contentValue);
          continue;
        }

        if (event.event === 'chat.done' || event.event === 'chat.error') {
          run.status = event.event === 'chat.done' ? 'done' : 'error';
          run.endedAt = timestamp;
          pushStep(
            event.event as ChatHistoryRunStepProps['type'],
            event.event === 'chat.done' ? 'Chat done' : 'Chat error',
            String(event.data.text ?? event.data.message ?? '')
          );
          continue;
        }
      }
    }

    if (transcriptEvents.length === 0) {
      const assistantLines = lines.filter((line) => line.payload?.type === 'message' && line.payload?.role === 'assistant');
      assistantLines.forEach((line, index) => {
        const contentValue = line.payload?.content?.map((item) => item.text ?? '').join('\n').trim() ?? '';
        if (!contentValue) return;

        const runId = `${sessionId}-assistant-log-${index + 1}`;
        const assistantMessageId = `${runId}-assistant-1`;
        runs.set(runId, {
          id: runId,
          anchorMessageId: assistantMessageId,
          status: 'done',
          startedAt: Date.now(),
          endedAt: Date.now(),
          steps: [
            {
              id: `${runId}-chat.update-1`,
              type: 'chat.update',
              label: 'Chat updated',
              detail: contentValue,
              timestamp: Date.now(),
            },
          ],
          commands: [],
          files: [],
          assistantMessages: [
            {
              id: assistantMessageId,
              content: contentValue,
              timestamp: Date.now(),
            },
          ],
        });
      });
    }

  }

  return [...runs.values()];
};

export class ChatHistoryDatasource {
  async getChatHistorySnapshot(params: { sessionId: string; limit?: number; beforeIndex?: number }) {
    const base = await parseRolloutMessages(params.sessionId);
    const persistedRuns = await extractRunsFromLogs(params.sessionId);
    const record = getStore().get(params.sessionId);
    const messages = [...base.messages, ...(record?.messages ?? [])];
    const runs = [...(record?.runs ?? []), ...persistedRuns];
    assignRunAnchors(messages, runs);
    const pageSize = Math.max(1, params.limit ?? 12);

    const beforeIndex = Math.max(0, params.beforeIndex ?? messages.length);
    const startIndex = Math.max(0, beforeIndex - pageSize);

    return {
      sessionId: params.sessionId,
      title: record?.title || base.title,
      messages: messages.slice(startIndex, beforeIndex),
      runs,
      totalMessages: messages.length,
      hasMoreBefore: startIndex > 0,
      nextBeforeIndex: startIndex > 0 ? startIndex : null,
    };
  }

  beginRun(params: {
    sessionId: string;
    runId: string;
    prompt: string;
    images?: string[];
  }) {
    const record = getSessionRecord(params.sessionId);
    record.title ||= params.prompt.trim() || params.sessionId;

    const userMessageId = buildRunUserMessageId(params.runId);
    appendUnique(record.messages, {
      id: userMessageId,
      role: 'user',
      content: params.prompt,
      ...(params.images?.length ? { images: params.images } : {}),
    });

    const run = getRun(record, params.runId);
    run.anchorMessageId = userMessageId;
    appendUnique(run.steps, {
      id: `${params.runId}-step-run-started`,
      type: 'run.started',
      label: 'Run started',
      detail: params.sessionId,
      timestamp: Date.now(),
    });
    commitRecord(params.sessionId, record);
    return run;
  }

  appendStep(params: { sessionId: string; runId: string; type: ChatHistoryRunStepProps['type']; label: string; detail?: string }) {
    const record = getSessionRecord(params.sessionId);
    const run = getRun(record, params.runId);
    appendUnique(run.steps, {
      id: `${params.runId}-${params.type}-${run.steps.length + 1}`,
      type: params.type,
      label: params.label,
      detail: params.detail,
      timestamp: Date.now(),
    });
    commitRecord(params.sessionId, record);
    return run;
  }

  appendCommand(params: {
    sessionId: string;
    runId: string;
    command: string;
    status: ChatHistoryRunCommandProps['status'];
    output?: string;
    exitCode?: number;
  }) {
    const record = getSessionRecord(params.sessionId);
    const run = getRun(record, params.runId);
    const commandId = `${params.runId}-command-${run.commands.length + 1}`;
    appendUnique(run.commands, {
      id: commandId,
      command: params.command,
      status: params.status,
      output: params.output,
      exitCode: params.exitCode,
      timestamp: Date.now(),
    });
    commitRecord(params.sessionId, record);
    return run;
  }

  appendFile(params: { sessionId: string; runId: string; path: string; kind: ChatHistoryRunFileProps['kind'] }) {
    const record = getSessionRecord(params.sessionId);
    const run = getRun(record, params.runId);
    appendUnique(run.files, {
      id: `${params.runId}-file-${run.files.length + 1}`,
      path: params.path,
      kind: params.kind,
      status: params.kind === 'file.created' ? 'created' : 'updated',
      timestamp: Date.now(),
    });
    commitRecord(params.sessionId, record);
    return run;
  }

  updateAssistantMessage(params: { sessionId: string; runId: string; content: string }) {
    const record = getSessionRecord(params.sessionId);
    const run = getRun(record, params.runId);
    const messageId = buildRunAssistantMessageId(params.runId);
    appendUnique(record.messages, {
      id: messageId,
      role: 'assistant',
      content: params.content,
    });
    appendUnique(run.assistantMessages, {
      id: messageId,
      content: params.content,
      timestamp: Date.now(),
    });
    appendUnique(run.steps, {
      id: `${params.runId}-step-chat-update-${run.steps.length + 1}`,
      type: 'chat.update',
      label: 'Chat updated',
      detail: params.content,
      timestamp: Date.now(),
    });
    commitRecord(params.sessionId, record);
    return run;
  }

  finalizeRun(params: { sessionId: string; runId: string; status: 'done' | 'error'; content?: string }) {
    const record = getSessionRecord(params.sessionId);
    const run = getRun(record, params.runId);
    run.status = params.status;
    run.endedAt = Date.now();
    if (params.content) {
      this.updateAssistantMessage({ sessionId: params.sessionId, runId: params.runId, content: params.content });
    }
    appendUnique(run.steps, {
      id: `${params.runId}-step-chat-${params.status}`,
      type: params.status === 'done' ? 'chat.done' : 'chat.error',
      label: params.status === 'done' ? 'Chat done' : 'Chat error',
      detail: params.content,
      timestamp: Date.now(),
    });
    commitRecord(params.sessionId, record);
    return run;
  }
}
