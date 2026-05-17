import { FetchService } from '@services/fetch.service';
import { handleHttpError } from '@utils/handleHttpError.util';
import type { ChatHistoryResult, HomeResponseGetSidebarData } from '@features/Home/domain/home.interface';
import { HomeRepository } from '@features/Home/domain/home.repository';

type HttpErrorLike = Parameters<typeof handleHttpError>[0];

export class HomeRepositoryImpl implements HomeRepository {
  constructor(private readonly fetchService = new FetchService()) {}

  async getSidebarData(): Promise<HomeResponseGetSidebarData> {
    try {
      return await this.fetchService.get<HomeResponseGetSidebarData>('/api/home/sidebar');
    } catch (error) {
      handleHttpError(error as HttpErrorLike, 'Failed to load sidebar data');
    }
  }

  async getChatHistory(sessionId: string): Promise<ChatHistoryResult> {
    try {
      return await this.fetchService.get<ChatHistoryResult>(`/api/home/sidebar/${sessionId}`);
    } catch (error) {
      handleHttpError(error as HttpErrorLike, 'Failed to load chat history');
    }
  }
}
