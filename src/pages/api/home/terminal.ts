import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { startTerminalRun, appendTerminalOutput, finalizeTerminalRun, failTerminalRun } from '@core/infrastructure/HomeTerminal/hometerminal.datasource';

type TerminalStartResponse = {
  jobId: string;
  command: string;
  cwd: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<TerminalStartResponse | { error: string }>) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const command = typeof req.body?.command === 'string' ? req.body.command.trim() : '';
  const cwd = typeof req.body?.cwd === 'string' && req.body.cwd.trim() ? req.body.cwd.trim() : process.cwd();

  if (!command) {
    res.status(400).json({ error: 'Missing command' });
    return;
  }

  const jobId = crypto.randomUUID();
  const record = startTerminalRun(jobId, command, cwd);

  const shell =
    process.platform === 'win32'
      ? 'powershell.exe'
      : process.env.SHELL && process.env.SHELL.trim()
        ? process.env.SHELL.trim()
        : 'sh';
  const shellArgs =
    process.platform === 'win32'
      ? ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command]
      : ['-lc', command];

  const child = spawn(shell, shellArgs, {
    cwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  child.stdout?.on('data', (chunk: Buffer) => {
    appendTerminalOutput(record.jobId, chunk.toString('utf8'));
  });

  child.stderr?.on('data', (chunk: Buffer) => {
    appendTerminalOutput(record.jobId, chunk.toString('utf8'));
  });

  child.on('error', (error) => {
    failTerminalRun(record.jobId, error.message, null);
  });

  child.on('close', (exitCode) => {
    finalizeTerminalRun(record.jobId, typeof exitCode === 'number' ? exitCode : null);
  });

  res.status(200).json({ jobId, command, cwd });
}
