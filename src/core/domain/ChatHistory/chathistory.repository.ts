import type { ChatHistoryRequest, ChatHistoryResponse } from './chathistory.interface';

export abstract class ChatHistoryRepository {
  abstract getChatHistory(params: ChatHistoryRequest.getChatHistory): Promise<ChatHistoryResponse.getChatHistory>;
}

