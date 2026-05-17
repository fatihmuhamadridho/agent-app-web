import type {
  SessionSidebarChatProps,
  SessionSidebarGroupProps,
  SessionSidebarItemProps,
} from './session.interface';

export class SessionSidebarItem implements SessionSidebarItemProps {
  id!: string;
  label!: string;
  time?: string;
  active?: boolean;

  constructor(props?: SessionSidebarItemProps) {
    Object.assign(this, props);
  }
}

export class SessionSidebarGroup implements SessionSidebarGroupProps {
  id!: string;
  label!: string;
  sessions!: SessionSidebarItem[];

  constructor(props?: SessionSidebarGroupProps) {
    Object.assign(this, props);
    this.sessions = (props?.sessions ?? []).map((session) => new SessionSidebarItem(session));
  }
}

export class SessionSidebarChat implements SessionSidebarChatProps {
  id!: string;
  label!: string;
  time?: string;
  active?: boolean;

  constructor(props?: SessionSidebarChatProps) {
    Object.assign(this, props);
  }
}

