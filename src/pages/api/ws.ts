import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server } from 'node:http';
import { ensureSessionRealtimeServer } from '../../core/infrastructure/Session/session.datasource';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  ensureSessionRealtimeServer((res.socket as unknown as { server?: Server | undefined })?.server as Server);
  res.status(200).json({ ok: true });
}
