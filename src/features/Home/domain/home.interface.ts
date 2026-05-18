export type SidebarProjectResponse = {
  id: string;
  label: string;
  time?: string;
  active?: boolean;
};

export type SidebarChatResponse = {
  id: string;
  label: string;
  time?: string;
  active?: boolean;
};

export type SidebarProjectGroupResponse = {
  id: string;
  label: string;
  sessions: SidebarProjectResponse[];
};

export type HomeResponseGetSidebarData = {
  projectGroups: SidebarProjectGroupResponse[];
  chats: SidebarChatResponse[];
};

export type HomeResultGetSidebarData = {
  projectGroups: SidebarProjectGroupResponse[];
  chats: SidebarChatResponse[];
};

export type ChatHistoryMessageResponse = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
};

export type ChatHistoryRunStepResponse = {
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
};

export type ChatHistoryRunCommandResponse = {
  id: string;
  command: string;
  status: 'in_progress' | 'completed' | 'failed';
  output?: string;
  exitCode?: number;
  timestamp: number;
};

export type ChatHistoryRunFileResponse = {
  id: string;
  path: string;
  kind: 'file.created' | 'file.updated';
  status: 'created' | 'updated';
  timestamp: number;
};

export type ChatHistoryRunAssistantMessageResponse = {
  id: string;
  content: string;
  timestamp: number;
};

export type ChatHistoryRunResponse = {
  id: string;
  anchorMessageId?: string;
  status: 'running' | 'done' | 'error';
  startedAt: number;
  endedAt: number | null;
  steps: ChatHistoryRunStepResponse[];
  commands: ChatHistoryRunCommandResponse[];
  files: ChatHistoryRunFileResponse[];
  assistantMessages: ChatHistoryRunAssistantMessageResponse[];
};

export type ChatHistoryResponse = {
  sessionId: string;
  title: string;
  messages: ChatHistoryMessageResponse[];
  runs: ChatHistoryRunResponse[];
  totalMessages: number;
  hasMoreBefore: boolean;
  nextBeforeIndex: number | null;
};

export type ChatHistoryResult = ChatHistoryResponse;
