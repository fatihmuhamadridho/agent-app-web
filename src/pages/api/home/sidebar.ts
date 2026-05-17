import type { NextApiRequest, NextApiResponse } from 'next';
import { SessionController } from '@core/domain/Session/session.controller';
import type { SessionResponse } from '@core/domain/Session/session.interface';

const sessionController = new SessionController();

export default async function handler(_req: NextApiRequest, res: NextApiResponse<SessionResponse.getSidebarData>) {
  try {
    const data = await sessionController.getSidebarData();
    res.status(200).json(data);
  } catch {
    res.status(500).json({ projectGroups: [], chats: [] });
  }
}
