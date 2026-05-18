export interface ChatHistoryMessageProps {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
}

export interface ChatHistoryRunStepProps {
  id: string;
  type:
    | 'run.started'
    | 'turn.started'
    | 'item.started'
    | 'item.updated'
    | 'item.completed'
    | 'chat.update'
    | 'chat.done'
    | 'chat.error';
  label: string;
  detail?: string;
  timestamp: number;
}

export interface ChatHistoryRunCommandProps {
  id: string;
  command: string;
  status: 'in_progress' | 'completed' | 'failed';
  output?: string;
  exitCode?: number;
  timestamp: number;
}

export interface ChatHistoryRunFileProps {
  id: string;
  path: string;
  kind: 'file.created' | 'file.updated';
  status: 'created' | 'updated';
  timestamp: number;
}

export interface ChatHistoryRunAssistantMessageProps {
  id: string;
  content: string;
  timestamp: number;
}

export interface ChatHistoryRunProps {
  id: string;
  anchorMessageId?: string;
  status: 'running' | 'done' | 'error';
  startedAt: number;
  endedAt: number | null;
  steps: ChatHistoryRunStepProps[];
  commands: ChatHistoryRunCommandProps[];
  files: ChatHistoryRunFileProps[];
  assistantMessages: ChatHistoryRunAssistantMessageProps[];
}

export interface ChatHistoryProps {
  sessionId: string;
  title: string;
  messages: ChatHistoryMessageProps[];
  runs: ChatHistoryRunProps[];
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
