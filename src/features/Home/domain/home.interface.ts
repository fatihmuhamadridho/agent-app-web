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
};

export type ChatHistoryResponse = {
  sessionId: string;
  title: string;
  messages: ChatHistoryMessageResponse[];
};

export type ChatHistoryResult = ChatHistoryResponse;
