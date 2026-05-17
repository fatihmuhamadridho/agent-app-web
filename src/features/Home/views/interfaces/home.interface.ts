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
}

export interface ModelVariantView {
  id: string;
  label: string;
  detail: string;
}
