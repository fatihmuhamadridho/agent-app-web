import { SessionRepositoryImpl } from '@core/infrastructure/Session/session.repository.impl';
import { GetSidebarDataUseCase } from './session.usecase';

export class SessionController {
  private readonly sessionRepositoryImpl: SessionRepositoryImpl;
  private readonly getSidebarDataUseCase: GetSidebarDataUseCase;

  constructor() {
    this.sessionRepositoryImpl = new SessionRepositoryImpl();
    this.getSidebarDataUseCase = new GetSidebarDataUseCase(this.sessionRepositoryImpl);
  }

  getSidebarData() {
    return this.getSidebarDataUseCase.execute();
  }
}

