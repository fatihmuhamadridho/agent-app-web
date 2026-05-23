import { Codex } from '@openai/codex-sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ChatPromptRepository } from '@core/domain/ChatPrompt/chatprompt.repository';
import type { ChatPromptRequest, ChatPromptResponse } from '@core/domain/ChatPrompt/chatprompt.interface';
import { sanitizePromptText } from '../_codex/codex-data';

const modelMap: Record<string, string> = {
  'gpt-5.4-mini': 'gpt-5.4-mini',
  'gpt-5.4': 'gpt-5.4',
  'gpt-5.2': 'gpt-5.2',
};

const DATA_URL_PATTERN = /^data:([^;]+);base64,(.+)$/;

const imageExtensionByMimeType: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};

const writeTempImage = async (dataUrl: string, index: number) => {
  const match = dataUrl.match(DATA_URL_PATTERN);
  if (!match) return null;

  const mimeType = match[1];
  const fileData = Buffer.from(match[2], 'base64');
  const extension = imageExtensionByMimeType[mimeType] ?? '.png';
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-app-web-'));
  const filePath = path.join(tempDir, `attachment-${index}${extension}`);

  await fs.writeFile(filePath, fileData);
  return filePath;
};

const createThreadOptions = (model: string) => ({
  workingDirectory: path.resolve(process.cwd()),
  model: modelMap[model] ?? model,
  skipGitRepoCheck: true,
});

export const createPromptThreadSession = (model: string) => {
  const codex = new Codex({
    env: process.env as Record<string, string>,
  });

  const thread = codex.startThread(createThreadOptions(model));
  if (!thread.id) {
    throw new Error('Failed to create prompt session');
  }

  return thread.id;
};

export class ChatPromptRepositoryImpl extends ChatPromptRepository {
  async sendPrompt(request: ChatPromptRequest): Promise<ChatPromptResponse> {
    const result = await runPromptStream(request);
    return {
      sessionId: result.sessionId,
      assistantMessage: result.finalMessage || 'No response returned.',
    };
  }
}

export type PromptStreamHandlers = {
  onRunStarted?: (payload: { sessionId: string }) => void;
  onTurnStarted?: (payload: { sessionId: string }) => void;
  onItemEvent?: (
    payload:
      | { event: 'item.started'; sessionId: string; item: { type: string; id: string } }
      | { event: 'item.updated'; sessionId: string; item: { type: string; id: string } }
      | { event: 'item.completed'; sessionId: string; item: { type: string; id: string } }
  ) => void;
  onCommandEvent?: (
    payload:
      | { event: 'tool.command.started'; sessionId: string; command: string; status: 'in_progress' }
      | { event: 'tool.command.completed'; sessionId: string; command: string; status: 'completed' | 'failed'; output?: string; exitCode?: number }
  ) => void;
  onFileEvent?: (
    payload:
      | { event: 'file.created'; sessionId: string; path: string }
      | { event: 'file.updated'; sessionId: string; path: string }
  ) => void;
  onThreadStarted?: (threadId: string) => void;
  onUpdate?: (payload: { sessionId: string; text: string }) => void;
  onDone?: (payload: { sessionId: string; text: string }) => void;
  onError?: (message: string) => void;
  signal?: AbortSignal;
};

export const runPromptStream = async (request: ChatPromptRequest, handlers?: PromptStreamHandlers) => {
  const codex = new Codex({
    env: process.env as Record<string, string>,
  });
  const prompt = sanitizePromptText(request.prompt);
  const imagePaths = await Promise.all((request.images ?? []).map((image, index) => writeTempImage(image, index)));
  const localImages = imagePaths.filter((image): image is string => Boolean(image));

  const thread =
    request.sessionId && request.sessionId !== 'new'
      ? codex.resumeThread(request.sessionId, {
          ...createThreadOptions(request.model),
        })
      : codex.startThread(createThreadOptions(request.model));

  const input = localImages.length
    ? [
        { type: 'text' as const, text: prompt },
        ...localImages.map((image) => ({ type: 'local_image' as const, path: image })),
      ]
    : prompt;

  const streamed = await thread.runStreamed(input, handlers?.signal ? { signal: handlers.signal } : undefined);
  let sessionId = thread.id ?? request.sessionId ?? 'new';
  let latestMessage = '';
  let errorMessage: string | null = null;

  if (thread.id) {
    sessionId = thread.id;
    handlers?.onThreadStarted?.(thread.id);
  }

  for await (const event of streamed.events) {
    if (event.type === 'thread.started') {
      sessionId = event.thread_id;
      handlers?.onThreadStarted?.(event.thread_id);
      handlers?.onRunStarted?.({ sessionId });
      continue;
    }

    if (event.type === 'turn.started') {
      handlers?.onTurnStarted?.({ sessionId });
      continue;
    }

    if (event.type === 'item.started' || event.type === 'item.updated' || event.type === 'item.completed') {
      const item = event.item;
      handlers?.onItemEvent?.({
        event: event.type,
        sessionId,
        item: { type: item.type, id: item.id },
      });

      if (item.type === 'agent_message') {
        latestMessage = item.text ?? latestMessage;
        handlers?.onUpdate?.({ sessionId, text: latestMessage });
      }

      if (item.type === 'command_execution' && event.type !== 'item.updated') {
        if (event.type === 'item.started') {
          handlers?.onCommandEvent?.({
            event: 'tool.command.started',
            sessionId,
            command: item.command,
            status: 'in_progress',
          });
        } else {
          handlers?.onCommandEvent?.({
            event: 'tool.command.completed',
            sessionId,
            command: item.command,
            status: item.status === 'failed' ? 'failed' : 'completed',
            output: item.aggregated_output || undefined,
            exitCode: item.exit_code,
          });
        }
      }

      if (item.type === 'command_execution' && event.type === 'item.updated') {
        handlers?.onCommandEvent?.({
          event: 'tool.command.started',
          sessionId,
          command: item.command,
          status: 'in_progress',
        });
      }

      if (item.type === 'file_change') {
        if (event.type !== 'item.completed') {
          continue;
        }

        for (const change of item.changes) {
          handlers?.onFileEvent?.({
            event: change.kind === 'add' ? 'file.created' : 'file.updated',
            sessionId,
            path: change.path,
          });
        }
      }

      continue;
    }

    if (event.type === 'turn.completed') {
      continue;
    }

    if (event.type === 'turn.failed' || event.type === 'error') {
      const message = event.type === 'turn.failed' ? event.error.message : event.message;
      handlers?.onError?.(message);
      errorMessage = message;
    }
  }

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  handlers?.onDone?.({ sessionId, text: latestMessage });
  return { sessionId, finalMessage: latestMessage };
};
