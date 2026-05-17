import type { ChatPromptRequest, ChatPromptResponse } from './chatprompt.interface';

export abstract class ChatPromptRepository {
  abstract sendPrompt(request: ChatPromptRequest): Promise<ChatPromptResponse>;
}

