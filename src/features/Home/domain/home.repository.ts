import type { ChatHistoryResult, HomeResponseGetSidebarData } from './home.interface';

export abstract class HomeRepository {
  abstract getSidebarData(): Promise<HomeResponseGetSidebarData>;
  abstract getChatHistory(sessionId: string): Promise<ChatHistoryResult>;
}
