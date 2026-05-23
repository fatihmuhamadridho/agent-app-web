import type { NextApiRequest, NextApiResponse } from 'next';
import { getTerminalRun, subscribeTerminalRun } from '@core/infrastructure/HomeTerminal/hometerminal.datasource';

const writeSseEvent = (res: NextApiResponse, event: string, data: unknown) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  const jobId = typeof req.query.jobId === 'string' ? req.query.jobId : Array.isArray(req.query.jobId) ? req.query.jobId[0] : '';
  if (!jobId) {
    res.status(400).json({ error: 'Missing jobId' });
    return;
  }

  const record = getTerminalRun(jobId);
  if (!record) {
    res.status(404).json({ error: 'Terminal run not found' });
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  writeSseEvent(res, 'snapshot', {
    jobId: record.jobId,
    command: record.command,
    cwd: record.cwd,
    status: record.status,
    output: record.output,
    exitCode: record.exitCode,
    errorMessage: record.errorMessage,
  });

  const unsubscribe = subscribeTerminalRun(jobId, (event) => {
    writeSseEvent(res, event.type, event);
    if (event.type === 'completed' || event.type === 'failed') {
      res.end();
    }
  });

  const close = () => {
    unsubscribe();
    if (!res.writableEnded) {
      res.end();
    }
  };

  req.on('close', close);
}
