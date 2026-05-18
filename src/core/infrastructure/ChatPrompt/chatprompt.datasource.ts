import type { ChatPromptRequest } from '@core/domain/ChatPrompt/chatprompt.interface';
import { randomUUID } from 'node:crypto';

type ChatPromptRecord = {
  request: ChatPromptRequest;
  status: 'pending' | 'running' | 'done' | 'error';
};
type ChatPromptStore = Map<string, ChatPromptRecord>;
type ChatPromptGlobal = typeof globalThis & {
  __agentAppChatPromptJobs?: ChatPromptStore;
};

export class ChatPromptDatasource {
  private static getJobs(): ChatPromptStore {
    const globalRef = globalThis as ChatPromptGlobal;
    if (!globalRef.__agentAppChatPromptJobs) {
      globalRef.__agentAppChatPromptJobs = new Map<string, ChatPromptRecord>();
    }

    return globalRef.__agentAppChatPromptJobs;
  }

  enqueue(request: ChatPromptRequest) {
    const jobId = randomUUID();
    ChatPromptDatasource.getJobs().set(jobId, { request, status: 'pending' });
    return { jobId };
  }

  get(jobId: string) {
    return ChatPromptDatasource.getJobs().get(jobId) ?? null;
  }

  markRunning(jobId: string) {
    const record = ChatPromptDatasource.getJobs().get(jobId);
    if (!record) return null;
    record.status = 'running';
    ChatPromptDatasource.getJobs().set(jobId, record);
    return record.request;
  }

  markDone(jobId: string) {
    const record = ChatPromptDatasource.getJobs().get(jobId);
    if (!record) return;
    record.status = 'done';
    ChatPromptDatasource.getJobs().set(jobId, record);
  }

  markError(jobId: string) {
    const record = ChatPromptDatasource.getJobs().get(jobId);
    if (!record) return;
    record.status = 'error';
    ChatPromptDatasource.getJobs().set(jobId, record);
  }

  delete(jobId: string) {
    ChatPromptDatasource.getJobs().delete(jobId);
  }
}
