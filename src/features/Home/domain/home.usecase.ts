import type { HomeResultGetSidebarData } from './home.interface';
import { HomeRepository } from './home.repository';

export class GetSidebarDataUseCase {
  constructor(private readonly homeRepository: HomeRepository) {}

  async execute(): Promise<HomeResultGetSidebarData> {
    const response = await this.homeRepository.getSidebarData();

    return {
      projectGroups: response.projectGroups ?? [],
      chats: response.chats ?? [],
    };
  }
}
