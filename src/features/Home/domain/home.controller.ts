import { HomeRepositoryImpl } from '@features/Home/infrastructure/home.repository.impl';
import { GetSidebarDataUseCase } from './home.usecase';

export class HomeController {
  private readonly homeRepositoryImpl: HomeRepositoryImpl;
  private readonly getSidebarDataUseCase: GetSidebarDataUseCase;

  constructor() {
    this.homeRepositoryImpl = new HomeRepositoryImpl();
    this.getSidebarDataUseCase = new GetSidebarDataUseCase(this.homeRepositoryImpl);
  }

  getSidebarData() {
    return this.getSidebarDataUseCase.execute();
  }

  getChatHistory(sessionId: string) {
    return this.homeRepositoryImpl.getChatHistory(sessionId);
  }
}
