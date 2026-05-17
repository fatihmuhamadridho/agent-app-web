import { SessionSidebarChat, SessionSidebarGroup, SessionSidebarItem } from './session.model';
import type { SessionResponse } from './session.interface';
import { SessionRepository } from './session.repository';

export class GetSidebarDataUseCase {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(): Promise<SessionResponse.getSidebarData> {
    const response = await this.sessionRepository.getSidebarData();

    return {
      projectGroups: (response.projectGroups ?? []).map((group) =>
        new SessionSidebarGroup({
          id: group.id,
          label: group.label,
          sessions: group.sessions.map((session) =>
            new SessionSidebarItem({
              id: session.id,
              label: session.label,
              time: session.time,
              active: session.active,
            }),
          ),
        }),
      ),
      chats: (response.chats ?? []).map(
        (chat) =>
          new SessionSidebarChat({
            id: chat.id,
            label: chat.label,
            time: chat.time,
            active: chat.active,
          }),
      ),
    };
  }
}

