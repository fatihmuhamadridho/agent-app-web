export type TerminalRunStatus = 'running' | 'completed' | 'failed';

export type TerminalRunEvent =
  | { type: 'started'; jobId: string; command: string; cwd: string }
  | { type: 'output'; jobId: string; chunk: string }
  | { type: 'completed'; jobId: string; exitCode: number | null }
  | { type: 'failed'; jobId: string; message: string; exitCode: number | null };

export type TerminalRunRecord = {
  jobId: string;
  command: string;
  cwd: string;
  status: TerminalRunStatus;
  output: string;
  exitCode: number | null;
  errorMessage: string | null;
  createdAt: number;
  updatedAt: number;
  listeners: Set<(event: TerminalRunEvent) => void>;
};

const terminalRuns = new Map<string, TerminalRunRecord>();

export const createTerminalRun = (jobId: string, command: string, cwd: string) => {
  const now = Date.now();
  const record: TerminalRunRecord = {
    jobId,
    command,
    cwd,
    status: 'running',
    output: '',
    exitCode: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    listeners: new Set(),
  };

  terminalRuns.set(jobId, record);
  return record;
};

export const getTerminalRun = (jobId: string) => terminalRuns.get(jobId);

export const subscribeTerminalRun = (jobId: string, listener: (event: TerminalRunEvent) => void) => {
  const record = terminalRuns.get(jobId);
  if (!record) return () => {};

  record.listeners.add(listener);
  return () => {
    record.listeners.delete(listener);
  };
};

const emitTerminalRunEvent = (record: TerminalRunRecord, event: TerminalRunEvent) => {
  record.updatedAt = Date.now();
  for (const listener of record.listeners) {
    listener(event);
  }
};

export const appendTerminalOutput = (jobId: string, chunk: string) => {
  const record = terminalRuns.get(jobId);
  if (!record) return;

  record.output += chunk;
  emitTerminalRunEvent(record, { type: 'output', jobId, chunk });
};

export const finalizeTerminalRun = (jobId: string, exitCode: number | null) => {
  const record = terminalRuns.get(jobId);
  if (!record) return;

  record.status = exitCode === 0 ? 'completed' : 'failed';
  record.exitCode = exitCode;
  emitTerminalRunEvent(record, { type: 'completed', jobId, exitCode });
};

export const failTerminalRun = (jobId: string, message: string, exitCode: number | null = null) => {
  const record = terminalRuns.get(jobId);
  if (!record) return;

  record.status = 'failed';
  record.errorMessage = message;
  record.exitCode = exitCode;
  emitTerminalRunEvent(record, { type: 'failed', jobId, message, exitCode });
};

export const startTerminalRun = (jobId: string, command: string, cwd: string) => {
  const record = createTerminalRun(jobId, command, cwd);
  emitTerminalRunEvent(record, { type: 'started', jobId, command, cwd });
  return record;
};
