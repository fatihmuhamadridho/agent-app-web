import type { ChatHistoryRequest, ChatHistoryResponse } from '@core/domain/ChatHistory/chathistory.interface';
import { ChatHistoryRepository } from '@core/domain/ChatHistory/chathistory.repository';
import { ChatHistoryDatasource } from './chathistory.datasource';

export class ChatHistoryRepositoryImpl extends ChatHistoryRepository {
  constructor(private readonly datasource = new ChatHistoryDatasource()) {
    super();
  }

  async getChatHistory(params: ChatHistoryRequest.getChatHistory): Promise<ChatHistoryResponse.getChatHistory> {
    return this.datasource.getChatHistorySnapshot(params);
  }
}
