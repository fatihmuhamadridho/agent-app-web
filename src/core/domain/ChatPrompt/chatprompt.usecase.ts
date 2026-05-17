import { ChatPromptRepository } from './chatprompt.repository';
import type { ChatPromptRequest, ChatPromptResponse } from './chatprompt.interface';

export class SendPromptUseCase {
  constructor(private readonly chatPromptRepository: ChatPromptRepository) {}

  async execute(request: ChatPromptRequest): Promise<ChatPromptResponse> {
    return this.chatPromptRepository.sendPrompt(request);
  }
}

