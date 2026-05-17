import { ChatHistory } from './chathistory.model';
import type { ChatHistoryRequest, ChatHistoryResponse } from './chathistory.interface';
import { ChatHistoryRepository } from './chathistory.repository';

export class GetChatHistoryUseCase {
  constructor(private readonly chatHistoryRepository: ChatHistoryRepository) {}

  async execute(params: ChatHistoryRequest.getChatHistory): Promise<ChatHistoryResponse.getChatHistory> {
    const response = await this.chatHistoryRepository.getChatHistory(params);

    return new ChatHistory({
      sessionId: response.sessionId,
      title: response.title,
      messages: response.messages ?? [],
      totalMessages: response.totalMessages,
      hasMoreBefore: response.hasMoreBefore,
      nextBeforeIndex: response.nextBeforeIndex,
    });
  }
}
