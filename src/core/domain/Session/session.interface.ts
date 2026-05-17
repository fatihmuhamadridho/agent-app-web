export interface SessionSidebarItemProps {
  id: string;
  label: string;
  time?: string;
  active?: boolean;
}

export interface SessionSidebarGroupProps {
  id: string;
  label: string;
  sessions: SessionSidebarItemProps[];
}

export interface SessionSidebarChatProps {
  id: string;
  label: string;
  time?: string;
  active?: boolean;
}

export interface SessionSidebarDataProps {
  projectGroups: SessionSidebarGroupProps[];
  chats: SessionSidebarChatProps[];
}

export declare namespace SessionResponse {
  export type getSidebarData = SessionSidebarDataProps;
}

