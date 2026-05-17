import type { ChatHistoryRequest, ChatHistoryResponse } from '@core/domain/ChatHistory/chathistory.interface';
import { ChatHistoryRepository } from '@core/domain/ChatHistory/chathistory.repository';
import fs from 'node:fs/promises';
import { extractContent, readThreadMeta, sanitizePromptText, type RolloutMessageRow } from '../_codex/codex-data';

const toRole = (type: string | undefined, role: string | undefined): ChatHistoryResponse.getChatHistory['messages'][number]['role'] | null => {
  if (role === 'user' || role === 'assistant' || role === 'system') return role;
  if (type === 'message') return null;
  return null;
};

const getChatHistory = async (params: ChatHistoryRequest.getChatHistory): Promise<ChatHistoryResponse.getChatHistory> => {
  const { rolloutPath, title, firstUserMessage } = readThreadMeta(params.sessionId);
  const pageSize = Math.max(1, params.limit ?? 12);
  let messages: ChatHistoryResponse.getChatHistory['messages'] = [];

  if (rolloutPath) {
    const rolloutRows = await fs.readFile(rolloutPath, 'utf8');
    const parsedRows = rolloutRows
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const row = JSON.parse(line) as RolloutMessageRow;
        const role = toRole(row.type, row.payload?.role);
        const content = sanitizePromptText(
          row.payload?.text ?? row.payload?.message ?? extractContent(row.payload?.content),
        );
        return role && content
          ? {
              id: `${params.sessionId}-${index}`,
              role,
              content,
            }
          : null;
      })
      .filter((message): message is ChatHistoryResponse.getChatHistory['messages'][number] => Boolean(message));

    const beforeIndex = Math.max(0, params.beforeIndex ?? parsedRows.length);
    const startIndex = Math.max(0, beforeIndex - pageSize);
    messages = parsedRows.slice(startIndex, beforeIndex);

    return {
      sessionId: params.sessionId,
      title: title || firstUserMessage || params.sessionId,
      messages,
      totalMessages: parsedRows.length,
      hasMoreBefore: startIndex > 0,
      nextBeforeIndex: startIndex > 0 ? startIndex : null,
    };
  }

  return {
    sessionId: params.sessionId,
    title: title || firstUserMessage || params.sessionId,
    messages,
    totalMessages: 0,
    hasMoreBefore: false,
    nextBeforeIndex: null,
  };
};

export class ChatHistoryRepositoryImpl extends ChatHistoryRepository {
  async getChatHistory(params: ChatHistoryRequest.getChatHistory): Promise<ChatHistoryResponse.getChatHistory> {
    return getChatHistory(params);
  }
}
