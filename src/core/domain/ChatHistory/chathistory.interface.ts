export interface ChatHistoryMessageProps {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatHistoryProps {
  sessionId: string;
  title: string;
  messages: ChatHistoryMessageProps[];
  totalMessages: number;
  hasMoreBefore: boolean;
  nextBeforeIndex: number | null;
}

export declare namespace ChatHistoryRequest {
  export type getChatHistory = {
    sessionId: string;
    limit?: number;
    beforeIndex?: number;
  };
}

export declare namespace ChatHistoryResponse {
  export type getChatHistory = ChatHistoryProps;
}
