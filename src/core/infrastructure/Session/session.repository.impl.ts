import { SessionRepository } from '@core/domain/Session/session.repository';
import type { SessionResponse } from '@core/domain/Session/session.interface';
import { SessionDatasource } from './session.datasource';

export class SessionRepositoryImpl extends SessionRepository {
  constructor(private readonly datasource = new SessionDatasource()) {
    super();
  }

  async getSidebarData(): Promise<SessionResponse.getSidebarData> {
    return this.datasource.getSidebarData();
  }
}
