import { Codex } from '@openai/codex-sdk';
import path from 'node:path';
import { ChatPromptRepository } from '@core/domain/ChatPrompt/chatprompt.repository';
import type { ChatPromptRequest, ChatPromptResponse } from '@core/domain/ChatPrompt/chatprompt.interface';
import { sanitizePromptText } from '../_codex/codex-data';

const modelMap: Record<string, string> = {
  'gpt-5.4-mini': 'gpt-5.4-mini',
  'gpt-5.4': 'gpt-5.4',
  'gpt-5.2': 'gpt-5.2',
};

export class ChatPromptRepositoryImpl extends ChatPromptRepository {
  async sendPrompt(request: ChatPromptRequest): Promise<ChatPromptResponse> {
    const codex = new Codex({
      env: process.env as Record<string, string>,
    });
    const prompt = sanitizePromptText(request.prompt);

    const thread =
      request.sessionId && request.sessionId !== 'new'
        ? codex.resumeThread(request.sessionId, {
            workingDirectory: path.resolve(process.cwd()),
            model: modelMap[request.model] ?? request.model,
            skipGitRepoCheck: true,
          })
        : codex.startThread({
            workingDirectory: path.resolve(process.cwd()),
            model: modelMap[request.model] ?? request.model,
            skipGitRepoCheck: true,
          });

    const turn = await thread.run(prompt);

    return {
      sessionId: thread.id ?? request.sessionId ?? 'new',
      assistantMessage: turn.finalResponse || 'No response returned.',
    };
  }
}
