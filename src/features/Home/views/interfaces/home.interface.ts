export interface NavItemView {
  label: string;
  icon: string;
  active?: boolean;
}

export interface ProjectItemView {
  id: string;
  label: string;
  time?: string;
  active?: boolean;
}

export interface ProjectGroupView {
  id: string;
  label: string;
  sessions: ProjectItemView[];
}

export interface ChatItemView {
  id: string;
  label: string;
  time?: string;
  active?: boolean;
}

export interface ChatMessageView {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
}

export interface ChatHistoryRunStepView {
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

export interface ChatHistoryRunCommandView {
  id: string;
  command: string;
  status: 'in_progress' | 'completed' | 'failed';
  output?: string;
  exitCode?: number;
  timestamp: number;
}

export interface ChatHistoryRunFileView {
  id: string;
  path: string;
  kind: 'file.created' | 'file.updated';
  status: 'created' | 'updated';
  timestamp: number;
}

export interface ChatHistoryRunAssistantMessageView {
  id: string;
  content: string;
  timestamp: number;
}

export interface ChatHistoryRunView {
  id: string;
  anchorMessageId?: string;
  status: 'running' | 'done' | 'error';
  startedAt: number;
  endedAt: number | null;
  steps: ChatHistoryRunStepView[];
  commands: ChatHistoryRunCommandView[];
  files: ChatHistoryRunFileView[];
  assistantMessages: ChatHistoryRunAssistantMessageView[];
}

export interface ModelVariantView {
  id: string;
  label: string;
  detail: string;
}
