import { Box, Button, Group, Text, Textarea } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import type { RefObject } from 'react';
import type { TerminalDrawerView } from '../interfaces/home.interface';
import styles from './MainPanel.module.scss';

type TerminalDrawerProps = {
  selectedSessionId?: string;
  terminal: TerminalDrawerView;
  terminalOutputRef: RefObject<HTMLDivElement | null>;
  onToggleTerminal: () => void;
  onDraftCommandChange: (value: string) => void;
  onRunCommand: () => void;
};

export const TerminalDrawer = ({
  selectedSessionId,
  terminal,
  terminalOutputRef,
  onToggleTerminal,
  onDraftCommandChange,
  onRunCommand,
}: TerminalDrawerProps) => {
  if (!terminal.isOpen) return null;

  return (
    <Box className={styles.terminalDrawer} aria-label="Terminal drawer">
      <Box className={styles.terminalHeader}>
        <Box>
          <Text className={styles.terminalTitle}>Terminal</Text>
          <Text className={styles.terminalSubtitle}>{selectedSessionId ? `Session ${selectedSessionId}` : 'Workspace shell'}</Text>
        </Box>
        <Group gap={8} wrap="nowrap">
          <Text className={styles.terminalStatus}>{terminal.isSubmitting ? 'Running' : 'Idle'}</Text>
          <button type="button" className={styles.toolbarIconButton} aria-label="Close terminal" onClick={onToggleTerminal}>
            <IconX size={16} />
          </button>
        </Group>
      </Box>

      <Box className={styles.terminalOutput} ref={terminalOutputRef}>
        {terminal.entries.length ? (
          terminal.entries.map((entry) => (
            <Box key={entry.id} className={styles.terminalEntry}>
              <Text className={styles.terminalCommand}>$ {entry.command}</Text>
              {entry.output ? <Text className={styles.terminalOutputText}>{entry.output}</Text> : null}
              {entry.errorMessage ? <Text className={styles.terminalError}>{entry.errorMessage}</Text> : null}
              <Text className={styles.terminalMeta}>
                {entry.status}
                {entry.exitCode !== null ? ` · exit ${entry.exitCode}` : ''}
              </Text>
            </Box>
          ))
        ) : (
          <Text className={styles.terminalEmpty}>No terminal history yet. Run a command to see output here.</Text>
        )}
      </Box>

      <Box className={styles.terminalComposer}>
        <Textarea
          value={terminal.draftCommand}
          onChange={(event) => onDraftCommandChange(event.currentTarget.value)}
          className={styles.terminalInput}
          placeholder="Enter a shell command"
          minRows={2}
          autosize
        />
        <Group justify="space-between" align="center">
          <Text className={styles.terminalHint}>Runs through the local shell on this workspace</Text>
          <Button className={styles.terminalRunButton} onClick={onRunCommand} loading={terminal.isSubmitting}>
            Run
          </Button>
        </Group>
        {terminal.error ? <Text className={styles.terminalErrorBanner}>{terminal.error}</Text> : null}
      </Box>
    </Box>
  );
};
