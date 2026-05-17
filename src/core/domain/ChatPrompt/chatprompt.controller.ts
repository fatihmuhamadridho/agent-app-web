import { ChatPromptRepositoryImpl } from '@core/infrastructure/ChatPrompt/chatprompt.repository.impl';
import { SendPromptUseCase } from './chatprompt.usecase';
import type { ChatPromptRequest } from './chatprompt.interface';

export class ChatPromptController {
  private readonly chatPromptRepositoryImpl: ChatPromptRepositoryImpl;
  private readonly sendPromptUseCase: SendPromptUseCase;

  constructor() {
    this.chatPromptRepositoryImpl = new ChatPromptRepositoryImpl();
    this.sendPromptUseCase = new SendPromptUseCase(this.chatPromptRepositoryImpl);
  }

  sendPrompt(request: ChatPromptRequest) {
    return this.sendPromptUseCase.execute(request);
  }
}

