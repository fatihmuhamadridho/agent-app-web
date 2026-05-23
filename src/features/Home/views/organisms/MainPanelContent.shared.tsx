import { Box, Text } from '@mantine/core';
import { IconChevronDown, IconFileText } from '@tabler/icons-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import type {
  ChatHistoryRunView,
  ConversationSegmentView,
  RunTimelineView,
} from '../interfaces/home.interface';
import styles from './MainPanel.module.scss';

type MessageLine =
  | { type: 'text'; content: string }
  | { type: 'bullet'; content: string }
  | { type: 'number'; index: number; content: string };

type InlineNode = { type: 'text'; content: string } | { type: 'code'; content: string };
type AssistantBlock = { type: 'text'; content: string } | { type: 'code'; language: string; content: string };
type HistoryRunEntry =
  | { type: 'assistant_text'; id: string; content: string; timestamp: number }
  | { type: 'command'; id: string; command: ChatHistoryRunView['commands'][number]; timestamp: number }
  | { type: 'file'; id: string; file: ChatHistoryRunView['files'][number]; timestamp: number }
  | { type: 'divider'; id: string };

const isStandalonePathLine = (line: string) => /^\((?:[A-Za-z]:\\|\/)[^)]+\)$/.test(line);
const fileLinkPattern = /^\[([^\]]+)\]\(([^)]+)\)$/;

const parseInlineTokens = (content: string): InlineNode[] => {
  const nodes: InlineNode[] = [];
  const tokenPattern = /(`+)([\s\S]*?)\1/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  while ((match = tokenPattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }

    nodes.push({ type: 'code', content: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    nodes.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return nodes;
};

const renderInlineContent = (content: string) =>
  parseInlineTokens(content).map((token, index) =>
    token.type === 'code' ? (
      <code key={`code-${index}`} className={styles.inlineCode}>
        {token.content}
      </code>
    ) : (
      <span key={`text-${index}`}>{token.content}</span>
    )
  );

const renderContentLine = (content: string) => {
  const match = content.match(fileLinkPattern);
  if (!match) {
    return renderInlineContent(content);
  }

  return (
    <Box className={styles.fileLine}>
      <IconFileText size={14} className={styles.fileLineIcon} />
      <Text className={styles.fileLineLabel}>{match[1]}</Text>
    </Box>
  );
};

const renderMessageLines = (content: string) => {
  const lines = content.split(/\r?\n/);
  const groups: MessageLine[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      groups.push({ type: 'text', content: '' });
      continue;
    }

    const bulletMatch = line.match(/^[-•]\s+(.*)$/);
    if (bulletMatch) {
      groups.push({ type: 'bullet', content: bulletMatch[1] });
      continue;
    }

    const numberMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numberMatch) {
      groups.push({ type: 'number', index: Number(numberMatch[1]), content: numberMatch[2] });
      continue;
    }

    if (isStandalonePathLine(line)) {
      continue;
    }

    groups.push({ type: 'text', content: line });
  }

  const nodes: ReactNode[] = [];
  let currentList: MessageLine[] = [];
  let currentListType: 'bullet' | 'number' | null = null;

  const flushList = () => {
    if (!currentList.length || !currentListType) return;

    if (currentListType === 'bullet') {
      nodes.push(
        <ul key={`bullet-${nodes.length}`} className={styles.messageList}>
          {currentList.map((item, index) => (
            <li key={`${item.type}-${index}`} className={styles.messageListItem}>
              {renderContentLine(item.content)}
            </li>
          ))}
        </ul>
      );
    } else {
      nodes.push(
        <ol key={`number-${nodes.length}`} className={styles.messageNumberList}>
          {currentList.map((item, index) => (
            <li key={`${item.type}-${item.type === 'number' ? item.index : index}`} className={styles.messageListItem}>
              {renderContentLine(item.content)}
            </li>
          ))}
        </ol>
      );
    }

    currentList = [];
    currentListType = null;
  };

  for (const line of groups) {
    if (line.type === 'bullet' || line.type === 'number') {
      if (currentListType && currentListType !== line.type) {
        flushList();
      }

      currentListType = line.type;
      currentList.push(line);
      continue;
    }

    flushList();

    if (line.content === '') {
      nodes.push(<Box key={`spacer-${nodes.length}`} className={styles.messageSpacer} />);
    } else {
      nodes.push(
        <Text key={`text-${nodes.length}`} className={styles.messageParagraph}>
          {renderContentLine(line.content)}
        </Text>
      );
    }
  }

  flushList();
  return nodes;
};

const parseAssistantBlocks = (content: string): AssistantBlock[] => {
  const blocks: AssistantBlock[] = [];
  const fencePattern = /```([\w-]+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  while ((match = fencePattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) {
        blocks.push({ type: 'text', content: text });
      }
    }

    blocks.push({
      type: 'code',
      language: match[1]?.trim() || 'text',
      content: match[2].replace(/\n+$/, ''),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) {
      blocks.push({ type: 'text', content: text });
    }
  }

  return blocks;
};

const copyTextToClipboard = async (text: string) => {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
  await navigator.clipboard.writeText(text);
};

export const renderAssistantContent = (content: string) =>
  parseAssistantBlocks(content).map((block, index) =>
    block.type === 'code' ? (
      <Box key={`code-${index}`} className={styles.codeBlock}>
        <Box className={styles.codeBlockHeader}>
          <Text className={styles.codeBlockLanguage}>{block.language}</Text>
          <button
            type="button"
            className={styles.codeBlockCopy}
            aria-label="Copy code"
            onClick={() => {
              void copyTextToClipboard(block.content);
            }}
          >
            <IconFileText size={14} />
          </button>
        </Box>
        <pre className={styles.codeBlockPre}>
          <code className={styles.codeBlockCode}>{block.content}</code>
        </pre>
      </Box>
    ) : (
      <Box key={`text-${index}`}>{renderMessageLines(block.content)}</Box>
    )
  );

export const renderMessageImages = (
  messageId: string,
  images: string[] | undefined,
  onPreviewImage: (image: string) => void
) =>
  images?.length ? (
    <Box className={styles.messageImages}>
      {images.map((image, index) => (
        <button
          key={`${messageId}-image-${index}`}
          type="button"
          className={styles.messageImageFrameButton}
          aria-label={`Preview attachment ${index + 1}`}
          onClick={() => onPreviewImage(image)}
        >
          <Box className={styles.messageImageFrame}>
            <Image className={styles.messageImage} src={image} alt={`Attachment ${index + 1}`} fill unoptimized />
          </Box>
        </button>
      ))}
    </Box>
  ) : null;

export const formatRunDuration = (startedAt: number, endedAt: number | null) => {
  const durationMs = Math.max(1000, (endedAt ?? startedAt) - startedAt);
  if (durationMs >= 60000) {
    return `Worked for ${Math.max(1, Math.round(durationMs / 60000))}m ${Math.round((durationMs % 60000) / 1000)}s`;
  }

  return `Worked for ${Math.max(1, Math.round(durationMs / 1000))}s`;
};

const buildRunEntries = (run: ChatHistoryRunView): HistoryRunEntry[] => {
  const baseEntries: HistoryRunEntry[] = [
    ...run.assistantMessages
      .filter((message) => message.content.trim())
      .map((message) => ({
        type: 'assistant_text' as const,
        id: message.id,
        content: message.content,
        timestamp: message.timestamp,
      })),
    ...run.commands.map((command) => ({
      type: 'command' as const,
      id: command.id,
      command,
      timestamp: command.timestamp,
    })),
    ...run.files.map((file) => ({
      type: 'file' as const,
      id: file.id,
      file,
      timestamp: file.timestamp,
    })),
  ].sort((left, right) => left.timestamp - right.timestamp);

  if (baseEntries.length < 6) return baseEntries;

  let dividerInserted = false;
  const entries: HistoryRunEntry[] = [];
  for (let index = 0; index < baseEntries.length; index += 1) {
    const entry = baseEntries[index];
    const shouldInsertDivider =
      !dividerInserted &&
      index >= Math.floor(baseEntries.length / 2) &&
      entry.type === 'assistant_text' &&
      baseEntries.slice(0, index).some((candidate) => candidate.type !== 'assistant_text');

    if (shouldInsertDivider) {
      entries.push({ type: 'divider', id: `${run.id}-divider` });
      dividerInserted = true;
    }

    entries.push(entry);
  }

  return entries;
};

export const renderRunBlock = (runItem: RunTimelineView) => {
  const { run, durationText } = runItem;
  const entries = buildRunEntries(run);

  return (
    <details key={run.id} className={styles.streamRunDetails}>
      <summary className={styles.streamRunSummary}>
        <Box className={styles.streamRunSummaryText}>
          <Text className={styles.streamRunTitle}>{durationText}</Text>
        </Box>
        <IconChevronDown size={16} className={styles.streamRunSummaryIcon} />
      </summary>

      <Box className={styles.streamRunBody}>
        {run.commands.length ? (
          <Text className={styles.streamActivityRow}>
            Ran {run.commands.length} command{run.commands.length === 1 ? '' : 's'}
          </Text>
        ) : null}
        {run.files.length ? (
          <Text className={styles.streamActivityRow}>
            Edited {run.files.length} file{run.files.length === 1 ? '' : 's'}
          </Text>
        ) : null}
        {run.steps.length ? (
          <Text className={styles.streamActivityRowMuted}>
            {run.steps.length} item{run.steps.length === 1 ? '' : 's'} processed
          </Text>
        ) : null}

        <Box component="div">
          {entries.map((entry) => {
            if (entry.type === 'assistant_text') {
              return (
                <Box key={entry.id} className={styles.streamNarrative}>
                  {renderAssistantContent(entry.content)}
                </Box>
              );
            }

            if (entry.type === 'divider') {
              return (
                <Box key={entry.id} className={styles.streamCompactedDivider}>
                  <Box className={styles.streamCompactedLine} />
                  <Text className={styles.streamCompactedLabel}>Context automatically compacted</Text>
                  <Box className={styles.streamCompactedLine} />
                </Box>
              );
            }

            if (entry.type === 'command') {
              const commandRun = entry.command;
              return (
                <details key={entry.id} className={styles.streamCommandDisclosure}>
                  <summary className={styles.streamCommandSummary}>
                    <Text className={styles.streamCommandSummaryText}>Ran command</Text>
                    <IconChevronDown size={14} className={styles.streamCommandSummaryIcon} />
                  </summary>
                  <Box className={styles.streamCommandCard}>
                    <Box className={styles.streamCommandHeader}>
                      <Text className={styles.streamCommandTitle}>Shell</Text>
                      <Text className={styles.streamCommandStatus}>
                        {commandRun.status === 'completed' ? 'Success' : commandRun.status === 'failed' ? 'Failed' : 'Running'}
                      </Text>
                    </Box>
                    <Box className={styles.streamCommandShell}>
                      <Text className={styles.streamCommandShellCommand}>{commandRun.command}</Text>
                    </Box>
                    {commandRun.output ? (
                      <Box className={styles.streamCommandOutputBlock}>
                        <Text className={styles.streamCommandOutput}>{commandRun.output}</Text>
                      </Box>
                    ) : null}
                    {typeof commandRun.exitCode === 'number' ? (
                      <Text className={styles.streamCommandExit}>Exit code: {commandRun.exitCode}</Text>
                    ) : null}
                  </Box>
                </details>
              );
            }

            return (
              <Box key={entry.id} className={styles.streamFileTimelineItem}>
                <Text className={styles.streamFileTimelineLabel}>
                  {entry.file.kind === 'file.created' ? 'Created file' : 'Updated file'}
                </Text>
                <Box className={styles.streamFileCard}>
                  <Box className={styles.streamFileHeader}>
                    <Text className={styles.streamFileTitle}>{entry.file.path}</Text>
                    <Text className={styles.streamFileStatus}>
                      {entry.file.status === 'created' ? 'Created' : 'Updated'}
                    </Text>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </details>
  );
};

export const renderConversationMessages = (
  segment: ConversationSegmentView,
  onPreviewImage: (image: string) => void
) => (
  <>
    {segment.userMessage ? (
      <Box component="div" className={`${styles.messageStack} ${styles.userStack}`}>
        {renderMessageImages(segment.userMessage.id, segment.userMessage.images, onPreviewImage)}
        <Box className={`${styles.message} ${styles.user}`}>
          <Text className={styles.messageText}>{segment.userMessage.content}</Text>
        </Box>
      </Box>
    ) : null}

    {segment.runItems.length ? segment.runItems.map((runItem) => renderRunBlock(runItem)) : null}

    {segment.assistantMessages.length
      ? segment.assistantMessages.map((message) => (
          <Box key={message.id} component="div" className={`${styles.messageStack} ${styles.assistantStack}`}>
            {renderMessageImages(message.id, message.images, onPreviewImage)}
            <Box className={`${styles.inlineMessage} ${styles[message.role]}`}>{renderAssistantContent(message.content)}</Box>
          </Box>
        ))
      : null}
  </>
);
