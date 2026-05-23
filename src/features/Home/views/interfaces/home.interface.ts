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

export interface ComposerAttachmentView {
  id: string;
  fileName: string;
  previewUrl: string | null;
  dataUrl: string | null;
  isImage: boolean;
}

export interface RunTimelineView {
  run: ChatHistoryRunView;
  durationText: string;
  isLatest: boolean;
}

export interface ConversationSegmentView {
  id: string;
  userMessage?: ChatMessageView;
  assistantMessages: ChatMessageView[];
  runItems: RunTimelineView[];
}

export interface TerminalEntryView {
  id: string;
  command: string;
  output: string;
  status: 'running' | 'completed' | 'failed';
  exitCode: number | null;
  errorMessage: string | null;
  createdAt: number;
}

export interface TerminalDrawerView {
  isOpen: boolean;
  isSubmitting: boolean;
  draftCommand: string;
  error: string | null;
  entries: TerminalEntryView[];
}

export interface ComposerView {
  draftPrompt: string;
  attachments: ComposerAttachmentView[];
  selectedModel: ModelVariantView;
  modelVariants: ModelVariantView[];
  isSubmitting: boolean;
  isAddMenuOpen: boolean;
  isModelMenuOpen: boolean;
}

export interface MainPanelViewProps {
  selectedSessionId?: string;
  title: string;
  isLandingPage: boolean;
  previewImage: string | null;
  leadingAssistantMessages: ChatMessageView[];
  conversationSegments: ConversationSegmentView[];
  isLoadingOlder: boolean;
  isPromptSubmitting: boolean;
  composer: ComposerView;
  terminal: TerminalDrawerView;
}
