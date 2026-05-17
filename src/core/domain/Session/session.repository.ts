import type { SessionResponse } from './session.interface';

export abstract class SessionRepository {
  abstract getSidebarData(): Promise<SessionResponse.getSidebarData>;
}

