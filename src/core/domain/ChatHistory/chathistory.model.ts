import type { ChatHistoryMessageProps, ChatHistoryProps } from './chathistory.interface';

export class ChatHistoryMessage implements ChatHistoryMessageProps {
  id!: string;
  role!: 'user' | 'assistant' | 'system';
  content!: string;

  constructor(props?: ChatHistoryMessageProps) {
    Object.assign(this, props);
  }
}

export class ChatHistory implements ChatHistoryProps {
  sessionId!: string;
  title!: string;
  messages!: ChatHistoryMessage[];
  totalMessages!: number;
  hasMoreBefore!: boolean;
  nextBeforeIndex!: number | null;

  constructor(props?: ChatHistoryProps) {
    Object.assign(this, props);
    this.messages = (props?.messages ?? []).map((message) => new ChatHistoryMessage(message));
  }
}
