import { ChatHistoryRepositoryImpl } from '@core/infrastructure/ChatHistory/chathistory.repository.impl';
import { GetChatHistoryUseCase } from './chathistory.usecase';
import type { ChatHistoryRequest } from './chathistory.interface';

export class ChatHistoryController {
  private readonly chatHistoryRepositoryImpl: ChatHistoryRepositoryImpl;
  private readonly getChatHistoryUseCase: GetChatHistoryUseCase;

  constructor() {
    this.chatHistoryRepositoryImpl = new ChatHistoryRepositoryImpl();
    this.getChatHistoryUseCase = new GetChatHistoryUseCase(this.chatHistoryRepositoryImpl);
  }

  getChatHistory(params: ChatHistoryRequest.getChatHistory) {
    return this.getChatHistoryUseCase.execute(params);
  }
}

