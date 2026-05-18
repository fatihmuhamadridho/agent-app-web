import type { NextApiRequest, NextApiResponse } from 'next';
import { ChatHistoryDatasource } from '@core/infrastructure/ChatHistory/chathistory.datasource';
import { ChatPromptDatasource } from '@core/infrastructure/ChatPrompt/chatprompt.datasource';
import { runPromptStream } from '@core/infrastructure/ChatPrompt/chatprompt.repository.impl';

const chatPromptDatasource = new ChatPromptDatasource();
const chatHistoryDatasource = new ChatHistoryDatasource();

const writeSseEvent = (res: NextApiResponse, event: string, data: unknown) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

const writeSseComment = (res: NextApiResponse, comment: string) => {
  res.write(`: ${comment}\n\n`);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  const jobId = typeof req.query.jobId === 'string' ? req.query.jobId : Array.isArray(req.query.jobId) ? req.query.jobId[0] : '';
  if (!jobId) {
    res.status(400).json({ error: 'Missing jobId' });
    return;
  }

  const record = chatPromptDatasource.get(jobId);
  if (!record) {
    res.status(404).json({ error: 'Prompt job not found' });
    return;
  }

  if (record.status === 'done' || record.status === 'error') {
    res.status(204).end();
    return;
  }

  const request = record.request;
  chatPromptDatasource.markRunning(jobId);

  const abortController = new AbortController();
  let streamErrored = false;
  let currentSessionId = request.sessionId && request.sessionId !== 'new' ? request.sessionId : '';
  let runStarted = false;

  const ensureRunStarted = (sessionId: string) => {
    currentSessionId = sessionId;
    if (runStarted) return;

    chatHistoryDatasource.beginRun({
      sessionId,
      runId: jobId,
      prompt: request.prompt,
      images: request.images,
    });
    runStarted = true;
  };

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  writeSseComment(res, 'connected');

  const close = () => {
    abortController.abort();
    if (!res.writableEnded) {
      res.end();
    }
  };

  req.on('close', close);

  try {
    await runPromptStream(request, {
      signal: abortController.signal,
      onThreadStarted: (threadId) => {
        ensureRunStarted(threadId);
      },
      onRunStarted: ({ sessionId }) => {
        ensureRunStarted(sessionId);
        writeSseEvent(res, 'run.started', { jobId, sessionId });
      },
      onTurnStarted: ({ sessionId }) => {
        if (!runStarted) {
          ensureRunStarted(sessionId);
        }
        chatHistoryDatasource.appendStep({
          sessionId,
          runId: jobId,
          type: 'turn.started',
          label: 'Turn started',
          detail: 'assistant is processing the prompt',
        });
        writeSseEvent(res, 'turn.started', { jobId, sessionId });
      },
      onItemEvent: (payload) => {
        if (!currentSessionId) return;
        chatHistoryDatasource.appendStep({
          sessionId: currentSessionId,
          runId: jobId,
          type: payload.event,
          label:
            payload.item.type === 'command_execution'
              ? payload.event === 'item.started'
                ? 'Command started'
                : payload.event === 'item.completed'
                  ? 'Command completed'
                  : 'Command updated'
              : payload.item.type === 'file_change'
                ? payload.event === 'item.started'
                  ? 'File change started'
                  : payload.event === 'item.completed'
                    ? 'File change completed'
                    : 'File change updated'
                : payload.event === 'item.started'
                  ? 'Item started'
                  : payload.event === 'item.completed'
                    ? 'Item completed'
                    : 'Item updated',
          detail: payload.item.type,
        });
        writeSseEvent(res, payload.event, { jobId, sessionId: payload.sessionId, item: payload.item });
      },
      onCommandEvent: (payload) => {
        if (!currentSessionId) return;
        let eventData:
          | {
              jobId: string;
              sessionId: string;
              command: string;
              status: 'in_progress' | 'completed' | 'failed';
              output?: string;
              exitCode?: number;
            }
          | {
              jobId: string;
              sessionId: string;
              command: string;
              status: 'in_progress' | 'completed' | 'failed';
            };

        if (payload.event === 'tool.command.completed') {
          chatHistoryDatasource.appendCommand({
            sessionId: currentSessionId,
            runId: jobId,
            command: payload.command,
            status: payload.status,
            output: payload.output,
            exitCode: payload.exitCode,
          });
          eventData = {
            jobId,
            sessionId: payload.sessionId,
            command: payload.command,
            status: payload.status,
            output: payload.output,
            exitCode: payload.exitCode,
          };
        } else {
          chatHistoryDatasource.appendCommand({
            sessionId: currentSessionId,
            runId: jobId,
            command: payload.command,
            status: payload.status,
          });
          eventData = {
            jobId,
            sessionId: payload.sessionId,
            command: payload.command,
            status: payload.status,
          };
        }
        writeSseEvent(res, payload.event, eventData);
      },
      onFileEvent: (payload) => {
        if (!currentSessionId) return;
        chatHistoryDatasource.appendFile({
          sessionId: currentSessionId,
          runId: jobId,
          path: payload.path,
          kind: payload.event,
        });
        writeSseEvent(res, payload.event, { jobId, sessionId: payload.sessionId, path: payload.path });
      },
      onUpdate: ({ sessionId, text }) => {
        ensureRunStarted(sessionId);
        chatHistoryDatasource.updateAssistantMessage({
          sessionId,
          runId: jobId,
          content: text,
        });
        writeSseEvent(res, 'chat.update', {
          jobId,
          sessionId,
          text,
        });
      },
      onDone: ({ sessionId, text }) => {
        ensureRunStarted(sessionId);
        chatHistoryDatasource.finalizeRun({
          sessionId,
          runId: jobId,
          status: 'done',
          content: text,
        });
        writeSseEvent(res, 'chat.done', {
          jobId,
          sessionId,
          text,
        });
        chatPromptDatasource.markDone(jobId);
      },
      onError: (message) => {
        streamErrored = true;
        if (currentSessionId) {
          chatHistoryDatasource.finalizeRun({
            sessionId: currentSessionId,
            runId: jobId,
            status: 'error',
          });
        }
        writeSseEvent(res, 'chat.error', { jobId, message });
        chatPromptDatasource.markError(jobId);
      },
    });
  } catch (error) {
    if (!streamErrored) {
      const message = error instanceof Error ? error.message : 'Failed to stream prompt';
      if (currentSessionId) {
        chatHistoryDatasource.finalizeRun({
          sessionId: currentSessionId,
          runId: jobId,
          status: 'error',
        });
      }
      writeSseEvent(res, 'chat.error', { jobId, message });
      chatPromptDatasource.markError(jobId);
    }
  } finally {
    req.off('close', close);
    close();
  }
}
