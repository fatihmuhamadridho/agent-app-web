import { Box, Button, Group, Stack, Text, Textarea } from '@mantine/core';
import {
  IconChevronDown,
  IconFilePlus,
  IconFileText,
  IconPaperclip,
  IconSend2,
  IconSparkles,
  IconSquareCheck,
  IconSquareX,
  IconX,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useGetChatHistory } from '@features/Home/infrastructure/home.hook';
import type {
  ChatHistoryRunView,
  ChatMessageView,
  ModelVariantView,
} from '../interfaces/home.interface';
import styles from './MainPanel.module.scss';

type MainPanelProps = {
  selectedSessionId?: string;
  modelVariants: ModelVariantView[];
  selectedModel: ModelVariantView;
  onSelectModel: (modelId: string) => void;
  onSelectSession?: (sessionId: string) => void;
};

type MessageLine =
  | { type: 'text'; content: string }
  | { type: 'bullet'; content: string }
  | { type: 'number'; index: number; content: string };

type InlineNode = { type: 'text'; content: string } | { type: 'code'; content: string };

type AssistantBlock =
  | { type: 'text'; content: string }
  | { type: 'code'; language: string; content: string };

type ComposerAttachment = {
  id: string;
  file: File;
  previewUrl: string | null;
  dataUrl: string | null;
  isImage: boolean;
};

type HistoryTimelineItem =
  | { type: 'user_message'; message: ChatMessageView }
  | { type: 'assistant_message'; message: ChatMessageView }
  | { type: 'run_group'; run: ChatHistoryRunView; durationText: string; isLatest: boolean };

type HistoryRunGroupItem = Extract<HistoryTimelineItem, { type: 'run_group' }>;
type ConversationSegment = {
  userMessage: ChatMessageView;
  assistantMessages: ChatMessageView[];
  runItems: HistoryRunGroupItem[];
};

type HistoryRunEntry =
  | { type: 'assistant_text'; id: string; content: string; timestamp: number }
  | { type: 'command'; id: string; command: ChatHistoryRunView['commands'][number]; timestamp: number }
  | { type: 'file'; id: string; file: ChatHistoryRunView['files'][number]; timestamp: number }
  | { type: 'divider'; id: string };

const isStandalonePathLine = (line: string) => /^\((?:[A-Za-z]:\\|\/)[^)]+\)$/.test(line);
const fileLinkPattern = /^\[([^\]]+)\]\(([^)]+)\)$/;
const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

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
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return;
  }

  await navigator.clipboard.writeText(text);
};

const renderAssistantContent = (content: string) =>
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

const renderMessageImages = (
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

const isImageFile = (file: File) => file.type.startsWith('image/');
const createRunStepId = (runId: string, type: string, timestamp: number) => `${runId}-${type}-${timestamp}`;
const formatRunDuration = (startedAt: number, endedAt: number | null) => {
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

  if (baseEntries.length < 6) {
    return baseEntries;
  }

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

export const MainPanel = ({
  selectedSessionId,
  modelVariants,
  selectedModel,
  onSelectModel,
  onSelectSession,
}: MainPanelProps) => {
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [composerAttachments, setComposerAttachments] = useState<ComposerAttachment[]>([]);
  const [draftPrompt, setDraftPrompt] = useState('');
  const [olderMessages, setOlderMessages] = useState<ChatMessageView[]>([]);
  const [localMessages, setLocalMessages] = useState<ChatMessageView[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [modelMenuStep, setModelMenuStep] = useState<'root' | 'models'>('root');
  const [streamRunDraft, setStreamRunDraft] = useState<ChatHistoryRunView | null>(null);
  const promptAbortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();
  const { data: chatHistoryData } = useGetChatHistory(selectedSessionId);
  const handlePreviewImage = (image: string) => {
    setPreviewImage(image);
  };
  const handleAddAttachments = (files: FileList | null) => {
    if (!files?.length) return;

    void (async () => {
      const incomingAttachments = await Promise.all(
        Array.from(files).map(async (file) => {
          const isImage = isImageFile(file);
          const dataUrl = await readFileAsDataUrl(file);

          return {
            id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
            file,
            previewUrl: isImage ? URL.createObjectURL(file) : null,
            dataUrl,
            isImage,
          } satisfies ComposerAttachment;
        })
      );

      setComposerAttachments((current) => [...current, ...incomingAttachments]);
      setIsAddMenuOpen(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    })();
  };
  const handleRemoveAttachment = (attachmentId: string) => {
    setComposerAttachments((current) => {
      const next = current.filter((attachment) => attachment.id !== attachmentId);
      const removed = current.find((attachment) => attachment.id === attachmentId);
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return next;
    });
  };
  const historyPaneRef = useRef<HTMLDivElement | null>(null);
  const addMenuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const modelPickerRef = useRef<HTMLDivElement | null>(null);
  const composerAttachmentsRef = useRef<ComposerAttachment[]>([]);
  const isPrependingOlderRef = useRef(false);
  const hasMoreBeforeRef = useRef(false);
  const nextBeforeIndexRef = useRef<number | null>(null);
  const shouldScrollToBottomRef = useRef(true);
  const streamEventSourceRef = useRef<EventSource | null>(null);
  const streamAssistantMessageIdRef = useRef<string | null>(null);
  const streamRunIdRef = useRef<string | null>(null);
  const intelligenceLevels = ['Low', 'Medium', 'High', 'Extra High'] as const;
  const baseMessages = useMemo(() => chatHistoryData?.messages ?? [], [chatHistoryData?.messages]);
  const baseRuns = useMemo(() => chatHistoryData?.runs ?? [], [chatHistoryData?.runs]);
  const displayedLocalMessages = useMemo(() => {
    const seenMessages = new Set(
      [...olderMessages, ...baseMessages].map((message) => `${message.role}|${message.content}|${message.images?.join('||') ?? ''}`)
    );

    return localMessages.filter((message) => {
      const signature = `${message.role}|${message.content}|${message.images?.join('||') ?? ''}`;
      return !seenMessages.has(signature);
    });
  }, [baseMessages, localMessages, olderMessages]);
  const displayedMessages = useMemo(
    () => [...olderMessages, ...baseMessages, ...displayedLocalMessages],
    [olderMessages, baseMessages, displayedLocalMessages]
  );

  const pushStreamActivity: (...activity: unknown[]) => void = () => {};

  const displayedRuns = useMemo(() => {
    const orderedBaseRuns = [...baseRuns].sort((left, right) => left.startedAt - right.startedAt);
    if (!streamRunDraft) return orderedBaseRuns;

    const filteredBaseRuns = orderedBaseRuns.filter((run) => run.id !== streamRunDraft.id);
    return [...filteredBaseRuns, streamRunDraft];
  }, [baseRuns, streamRunDraft]);

  const conversationSegments = useMemo<ConversationSegment[]>(() => {
    const userSegments: ConversationSegment[] = [];
    let activeSegment: ConversationSegment | null = null;

    displayedMessages.forEach((message) => {
      if (message.role === 'user') {
        activeSegment = { userMessage: message, assistantMessages: [], runItems: [] };
        userSegments.push(activeSegment);
        return;
      }

      if (message.role === 'assistant' && activeSegment) {
        activeSegment.assistantMessages.push(message);
      }
    });

    const runsByAnchorMessageId = new Map<string, HistoryRunGroupItem[]>();
    const assignedRunIds = new Set<string>();

    displayedRuns.forEach((run, index) => {
      const item: HistoryRunGroupItem = {
        type: 'run_group',
        run,
        durationText: formatRunDuration(run.startedAt, run.endedAt),
        isLatest: index === displayedRuns.length - 1,
      };

      const anchorMessageId = run.anchorMessageId?.trim();
      if (!anchorMessageId) return;

      const existing = runsByAnchorMessageId.get(anchorMessageId) ?? [];
      existing.push(item);
      runsByAnchorMessageId.set(anchorMessageId, existing);
      assignedRunIds.add(run.id);
    });

    userSegments.forEach((segment) => {
      const runItems = runsByAnchorMessageId.get(segment.userMessage.id);
      if (!runItems) return;

      segment.runItems = [...runItems].sort((left, right) => left.run.startedAt - right.run.startedAt);
    });

    const fallbackSegments = userSegments.filter((segment) => segment.runItems.length === 0);
    let fallbackIndex = 0;

    displayedRuns.forEach((run, index) => {
      if (assignedRunIds.has(run.id)) return;
      const segment = fallbackSegments[fallbackIndex];
      if (!segment) return;

      const item: HistoryRunGroupItem = {
        type: 'run_group',
        run,
        durationText: formatRunDuration(run.startedAt, run.endedAt),
        isLatest: index === displayedRuns.length - 1,
      };

      segment.runItems = [item];
      fallbackIndex += 1;
    });

    return userSegments;
  }, [displayedMessages, displayedRuns]);

  const renderLegacyRunBlock = (run: ChatHistoryRunView, durationText: string) => (
    <details key={run.id} className={styles.streamRunDetails}>
      <summary className={styles.streamRunSummary}>
        <Box className={styles.streamRunSummaryText}>
          <Text className={styles.streamRunTitle}>{durationText}</Text>
          <Box className={styles.streamRunMeta}>
            <Text className={styles.streamRunMetaText}>
              Ran {run.commands.length} command{run.commands.length === 1 ? '' : 's'}
            </Text>
            <Text className={styles.streamRunMetaText}>
              Edited {run.files.length} file{run.files.length === 1 ? '' : 's'}
            </Text>
            <Text className={styles.streamRunMetaText}>
              {run.steps.length} item{run.steps.length === 1 ? '' : 's'} processed
            </Text>
          </Box>
        </Box>
        <IconChevronDown size={16} className={styles.streamRunSummaryIcon} />
      </summary>

      <Box className={styles.streamRunBody}>
        {run.commands.length ? (
          <Box className={styles.streamRunSection}>
            <Text className={styles.streamRunSectionTitle}>
              Ran {run.commands.length} command{run.commands.length === 1 ? '' : 's'}
            </Text>
            <Stack gap={8}>
              {run.commands.map((commandRun) => (
                <Box key={commandRun.id} className={styles.streamCommandCard}>
                  <Stack gap={6}>
                    <Box className={styles.streamCommandHeader}>
                      <Text className={styles.streamCommandTitle}>Ran command</Text>
                      <Text className={styles.streamCommandStatus}>
                        {commandRun.status === 'completed'
                          ? 'Success'
                          : commandRun.status === 'failed'
                            ? 'Failed'
                            : 'Running'}
                      </Text>
                    </Box>
                    <Box className={styles.streamCommandShell}>
                      <Text className={styles.streamCommandShellLabel}>Shell</Text>
                      <Text className={styles.streamCommandShellCommand}>{commandRun.command}</Text>
                    </Box>
                    {commandRun.output ? (
                      <Box className={styles.streamCommandOutputBlock}>
                        <Text className={styles.streamCommandOutputLabel}>Output</Text>
                        <Text className={styles.streamCommandOutput}>{commandRun.output}</Text>
                      </Box>
                    ) : null}
                    {typeof commandRun.exitCode === 'number' ? (
                      <Text className={styles.streamCommandExit}>Exit code: {commandRun.exitCode}</Text>
                    ) : null}
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        ) : null}

        {run.files.length ? (
          <Box className={styles.streamRunSection}>
            <Text className={styles.streamRunSectionTitle}>
              Edited {run.files.length} file{run.files.length === 1 ? '' : 's'}
            </Text>
            <Stack gap={8}>
              {run.files.map((fileRun) => (
                <Box key={fileRun.id} className={styles.streamFileCard}>
                  <Stack gap={6}>
                    <Box className={styles.streamFileHeader}>
                      <Text className={styles.streamFileTitle}>
                        {fileRun.kind === 'file.created' ? 'Created file' : 'Edited file'}
                      </Text>
                      <Text className={styles.streamFileStatus}>
                        {fileRun.status === 'created' ? 'Created' : 'Updated'}
                      </Text>
                    </Box>
                    <Text className={styles.streamFilePath}>{fileRun.path}</Text>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        ) : null}

        {run.steps.length ? (
          <Box className={styles.streamRunSection}>
            <Text className={styles.streamRunSectionTitle}>Timeline</Text>
            <Stack gap={4}>
              {run.steps.map((step) => (
                <Text key={step.id} className={styles.streamRunLineMuted}>
                  {step.label}
                  {step.detail ? ` • ${step.detail}` : ''}
                </Text>
              ))}
            </Stack>
          </Box>
        ) : null}

        {run.assistantMessages.length ? (
          <Box className={styles.streamRunSection}>
            <Text className={styles.streamRunSectionTitle}>Assistant response</Text>
            <Stack gap={4}>
              {run.assistantMessages.map((message) => (
                <Text key={message.id} className={styles.streamRunLine}>
                  {message.content}
                </Text>
              ))}
            </Stack>
          </Box>
        ) : null}
      </Box>
    </details>
  );

  void renderLegacyRunBlock;

  const renderRunBlock = (run: ChatHistoryRunView, durationText: string) => {
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

          <Stack gap={12}>
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
                      <Stack gap={10}>
                        <Box className={styles.streamCommandHeader}>
                          <Text className={styles.streamCommandTitle}>Shell</Text>
                          <Text className={styles.streamCommandStatus}>
                            {commandRun.status === 'completed'
                              ? 'Success'
                              : commandRun.status === 'failed'
                                ? 'Failed'
                                : 'Running'}
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
                      </Stack>
                    </Box>
                  </details>
                );
              }

              return (
                <Box key={entry.id} className={styles.streamFileTimelineItem}>
                  <Text className={styles.streamFileTimelineLabel}>
                    {entry.file.kind === 'file.created' ? 'Created file' : 'Edited file'}
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
          </Stack>
        </Box>
      </details>
    );
  };

  const updateRunDraft = (updater: (current: ChatHistoryRunView) => ChatHistoryRunView) => {
    setStreamRunDraft((current) => (current ? updater(current) : current));
  };

  const appendRunStepDraft = (step: ChatHistoryRunView['steps'][number]) => {
    updateRunDraft((current) => ({
      ...current,
      steps: [...current.steps.filter((item) => item.id !== step.id), step],
    }));
  };

  useEffect(() => {
    composerAttachmentsRef.current = composerAttachments;
  }, [composerAttachments]);

  useEffect(
    () => () => {
      composerAttachmentsRef.current.forEach((attachment) => {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      });
    },
    []
  );

  useEffect(() => {
    if (!chatHistoryData || !selectedSessionId) return;

    hasMoreBeforeRef.current = Boolean(chatHistoryData.hasMoreBefore);
    nextBeforeIndexRef.current = chatHistoryData.nextBeforeIndex ?? null;
  }, [chatHistoryData, selectedSessionId]);

  useEffect(() => {
    if (!shouldScrollToBottomRef.current) return;
    const container = historyPaneRef.current;
    if (!container) return;

    container.scrollTop = container.scrollHeight;
    shouldScrollToBottomRef.current = false;
  }, [baseMessages.length, localMessages.length, selectedSessionId]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const clickedInsideAddMenu = Boolean(addMenuRef.current?.contains(target));
      const clickedInsideModelMenu = Boolean(modelPickerRef.current?.contains(target));

      if (!clickedInsideAddMenu) {
        setIsAddMenuOpen(false);
      }

      if (!clickedInsideModelMenu) {
        setIsModelMenuOpen(false);
        setModelMenuStep('root');
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(
    () => () => {
      streamEventSourceRef.current?.close();
      streamEventSourceRef.current = null;
    },
    []
  );

  const loadOlderMessages = async () => {
    if (!selectedSessionId || !hasMoreBeforeRef.current || isLoadingOlder || nextBeforeIndexRef.current === null)
      return;

    setIsLoadingOlder(true);
    isPrependingOlderRef.current = true;
    shouldScrollToBottomRef.current = false;

    try {
      const response = await fetch(
        `/api/home/sidebar/${selectedSessionId}?limit=12&beforeIndex=${encodeURIComponent(String(nextBeforeIndexRef.current))}`
      );

      if (!response.ok) {
        throw new Error('Failed to load older history');
      }

      const data = (await response.json()) as {
        messages?: ChatMessageView[];
        hasMoreBefore?: boolean;
        nextBeforeIndex?: number | null;
      };

      setOlderMessages((current) => [...(data.messages ?? []), ...current]);
      hasMoreBeforeRef.current = Boolean(data.hasMoreBefore);
      nextBeforeIndexRef.current = data.nextBeforeIndex ?? null;
    } finally {
      isPrependingOlderRef.current = false;
      setIsLoadingOlder(false);
    }
  };

  const handleSubmitPrompt = async () => {
    const prompt = draftPrompt.trim();
    if ((!prompt && composerAttachments.length === 0) || isSubmitting) return;

    const abortController = new AbortController();
    promptAbortControllerRef.current = abortController;

    const nextMessage: ChatMessageView = {
      id: `${selectedSessionId ?? 'new'}-${Date.now()}`,
      role: 'user',
      content: prompt,
      images: composerAttachments
        .filter((attachment) => attachment.isImage && attachment.dataUrl)
        .map((attachment) => attachment.dataUrl as string),
    };

    const assistantMessageId = `${selectedSessionId ?? 'new'}-assistant-${Date.now()}`;
    streamAssistantMessageIdRef.current = assistantMessageId;
    setLocalMessages((current) => [
      ...current,
      nextMessage,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
      },
    ]);
    setDraftPrompt('');
    composerAttachments.forEach((attachment) => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    });
    setComposerAttachments([]);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/home/prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
        body: JSON.stringify({
          sessionId: selectedSessionId,
          prompt,
          model: selectedModel.id,
          images: composerAttachments
            .filter((attachment) => attachment.isImage && attachment.dataUrl)
            .map((attachment) => attachment.dataUrl as string),
        }),
      });

      const data = (await response.json()) as { jobId?: string };

      if (!response.ok) {
        throw new Error('Failed to queue prompt');
      }

      if (!data.jobId) {
        throw new Error('Failed to start prompt stream');
      }

      const runId = data.jobId;
      streamRunIdRef.current = runId;
      setStreamRunDraft({
        id: runId,
        status: 'running',
        startedAt: Date.now(),
        endedAt: null,
        steps: [
          {
            id: createRunStepId(runId, 'run.started', Date.now()),
            type: 'run.started',
            label: 'Run started',
            detail: selectedSessionId ?? 'new session',
            timestamp: Date.now(),
          },
        ],
        commands: [],
        files: [],
        assistantMessages: [],
      });

      const eventSource = new EventSource(`/api/home/prompt/stream?jobId=${encodeURIComponent(data.jobId)}`);
      streamEventSourceRef.current = eventSource;

      eventSource.addEventListener('run.started', (event) => {
        JSON.parse((event as MessageEvent).data as string);
      });

      eventSource.addEventListener('turn.started', (event) => {
        const payload = JSON.parse((event as MessageEvent).data as string) as {
          sessionId?: string;
        };
        appendRunStepDraft({
          id: createRunStepId(runId, 'turn.started', Date.now()),
          type: 'turn.started',
          label: 'Turn started',
          detail: 'assistant is processing the prompt',
          timestamp: Date.now(),
        });
        if (payload.sessionId && payload.sessionId !== selectedSessionId) {
          onSelectSession?.(payload.sessionId);
        }
      });

      eventSource.addEventListener('item.started', (event) => {
        const payload = JSON.parse((event as MessageEvent).data as string) as {
          item?: { type?: string };
          sessionId?: string;
        };
        const itemType = payload.item?.type ?? 'unknown';
        appendRunStepDraft({
          id: createRunStepId(runId, `item.started-${itemType}`, Date.now()),
          type: 'item.started',
          label:
            itemType === 'command_execution'
              ? 'Command started'
              : itemType === 'file_change'
                ? 'File change started'
                : 'Item started',
          detail: itemType,
          timestamp: Date.now(),
        });
        if (payload.sessionId && payload.sessionId !== selectedSessionId) {
          onSelectSession?.(payload.sessionId);
        }
      });

      eventSource.addEventListener('item.updated', (event) => {
        const payload = JSON.parse((event as MessageEvent).data as string) as {
          item?: { type?: string };
          sessionId?: string;
        };
        const itemType = payload.item?.type ?? 'unknown';
        appendRunStepDraft({
          id: createRunStepId(runId, `item.updated-${itemType}`, Date.now()),
          type: 'item.updated',
          label:
            itemType === 'command_execution'
              ? 'Command updated'
              : itemType === 'file_change'
                ? 'File change updated'
                : 'Item updated',
          detail: itemType,
          timestamp: Date.now(),
        });
        if (payload.sessionId && payload.sessionId !== selectedSessionId) {
          onSelectSession?.(payload.sessionId);
        }
      });

      eventSource.addEventListener('item.completed', (event) => {
        const payload = JSON.parse((event as MessageEvent).data as string) as {
          item?: { type?: string };
          sessionId?: string;
        };
        const itemType = payload.item?.type ?? 'unknown';
        appendRunStepDraft({
          id: createRunStepId(runId, `item.completed-${itemType}`, Date.now()),
          type: 'item.completed',
          label:
            itemType === 'command_execution'
              ? 'Command completed'
              : itemType === 'file_change'
                ? 'File change completed'
                : 'Item completed',
          detail: itemType,
          timestamp: Date.now(),
        });
        if (payload.sessionId && payload.sessionId !== selectedSessionId) {
          onSelectSession?.(payload.sessionId);
        }
      });

      eventSource.addEventListener('tool.command.started', (event) => {
        const payload = JSON.parse((event as MessageEvent).data as string) as {
          command?: string;
        };
        pushStreamActivity({
          type: 'tool.command.started',
          label: 'Command started',
          command: payload.command ?? '',
          detail: payload.command ?? '',
          status: 'in_progress',
        });
      });

      eventSource.addEventListener('tool.command.completed', (event) => {
        const payload = JSON.parse((event as MessageEvent).data as string) as {
          command?: string;
          status?: string;
          exitCode?: number;
          output?: string;
        };
        pushStreamActivity({
          type: 'tool.command.completed',
          label: 'Command completed',
          command: payload.command ?? '',
          detail: [payload.command, payload.status, payload.exitCode].filter(Boolean).join(' • '),
          status: payload.status === 'failed' ? 'failed' : 'completed',
          output: payload.output,
          exitCode: payload.exitCode,
        });
      });

      eventSource.addEventListener('file.created', (event) => {
        const payload = JSON.parse((event as MessageEvent).data as string) as {
          path?: string;
        };
        pushStreamActivity({
          type: 'file.created',
          label: 'File created',
          path: payload.path ?? '',
          detail: payload.path ?? '',
        });
      });

      eventSource.addEventListener('file.updated', (event) => {
        const payload = JSON.parse((event as MessageEvent).data as string) as {
          path?: string;
        };
        pushStreamActivity({
          type: 'file.updated',
          label: 'File updated',
          path: payload.path ?? '',
          detail: payload.path ?? '',
        });
      });

      eventSource.addEventListener('chat.update', (event) => {
        const payload = JSON.parse((event as MessageEvent).data as string) as {
          sessionId?: string;
          text?: string;
        };

        if (payload.sessionId && payload.sessionId !== selectedSessionId) {
          onSelectSession?.(payload.sessionId);
        }

        if (streamAssistantMessageIdRef.current) {
          setLocalMessages((current) =>
            current.map((message) =>
              message.id === streamAssistantMessageIdRef.current
                ? { ...message, content: payload.text ?? message.content }
                : message
            )
          );
        }

        shouldScrollToBottomRef.current = true;
      });

      eventSource.addEventListener('chat.done', (event) => {
        const payload = JSON.parse((event as MessageEvent).data as string) as {
          sessionId?: string;
          text?: string;
        };

        if (streamAssistantMessageIdRef.current) {
          setLocalMessages((current) =>
            current.map((message) =>
              message.id === streamAssistantMessageIdRef.current
                ? { ...message, content: payload.text ?? message.content }
                : message
            )
          );
        }

        if (payload.sessionId && payload.sessionId !== selectedSessionId) {
          onSelectSession?.(payload.sessionId);
        }

        pushStreamActivity({
          type: 'chat.done',
          label: 'Run completed',
          detail: payload.sessionId ?? 'session updated',
        });
        eventSource.close();
        if (streamEventSourceRef.current === eventSource) {
          streamEventSourceRef.current = null;
        }
        streamAssistantMessageIdRef.current = null;
        shouldScrollToBottomRef.current = true;
        setStreamRunDraft(null);
        setIsSubmitting(false);
        void queryClient.invalidateQueries({ queryKey: ['home-chat-history', payload.sessionId ?? selectedSessionId] });
      });

      eventSource.addEventListener('chat.error', (event) => {
        const payload = JSON.parse((event as MessageEvent).data as string) as {
          message?: string;
          sessionId?: string;
        };

        eventSource.close();
        if (streamEventSourceRef.current === eventSource) {
          streamEventSourceRef.current = null;
        }
        pushStreamActivity({
          type: 'chat.error',
          label: 'Run failed',
          detail: payload.message ?? 'unknown error',
        });
        const assistantMessageId = streamAssistantMessageIdRef.current;
        streamAssistantMessageIdRef.current = null;
        if (assistantMessageId) {
          setLocalMessages((current) => current.filter((message) => message.id !== assistantMessageId));
        }
        setLocalMessages((current) => [
          ...current,
          {
            id: `${selectedSessionId ?? 'new'}-error-${Date.now()}`,
            role: 'system',
            content: payload.message ?? 'Failed to stream prompt',
          },
        ]);
        setStreamRunDraft(null);
        setIsSubmitting(false);
        void queryClient.invalidateQueries({ queryKey: ['home-chat-history', payload.sessionId ?? selectedSessionId] });
      });

      eventSource.onerror = () => {
        eventSource.close();
        if (streamEventSourceRef.current === eventSource) {
          streamEventSourceRef.current = null;
        }
        pushStreamActivity({
          type: 'chat.error',
          label: 'Stream closed',
          detail: 'unexpectedly',
        });
        const assistantMessageId = streamAssistantMessageIdRef.current;
        streamAssistantMessageIdRef.current = null;
        if (assistantMessageId) {
          setLocalMessages((current) => current.filter((message) => message.id !== assistantMessageId));
        }
        setLocalMessages((current) => [
          ...current,
          {
            id: `${selectedSessionId ?? 'new'}-error-${Date.now()}`,
            role: 'system',
            content: 'SSE connection closed unexpectedly',
          },
        ]);
        setStreamRunDraft(null);
        setIsSubmitting(false);
        void queryClient.invalidateQueries({ queryKey: ['home-chat-history', selectedSessionId] });
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to send prompt';
      streamEventSourceRef.current?.close();
      streamEventSourceRef.current = null;
      const assistantMessageId = streamAssistantMessageIdRef.current;
      streamAssistantMessageIdRef.current = null;
      if (assistantMessageId) {
        setLocalMessages((current) => current.filter((message) => message.id !== assistantMessageId));
      }
      setStreamRunDraft(null);
      setLocalMessages((current) => [
        ...current,
        {
          id: `${selectedSessionId ?? 'new'}-error-${Date.now()}`,
          role: 'system',
          content: errorMessage,
        },
      ]);
      setIsSubmitting(false);
      return;
    } finally {
      promptAbortControllerRef.current = null;
    }
  };

  const handleStopPrompt = () => {
    promptAbortControllerRef.current?.abort();
    streamEventSourceRef.current?.close();
    streamEventSourceRef.current = null;
    const assistantMessageId = streamAssistantMessageIdRef.current;
    streamAssistantMessageIdRef.current = null;
    if (assistantMessageId) {
      setLocalMessages((current) => current.filter((message) => message.id !== assistantMessageId));
    }
    setStreamRunDraft(null);
    setIsSubmitting(false);
  };

  return (
    <Box className={styles.panel}>
      <Box className={styles.toolbar}>
        <Text className={styles.threadTitle}>{chatHistoryData?.title || 'What should we work on?'}</Text>
        <Box className={styles.toolbarDot} />
      </Box>

      <Stack className={styles.body} gap={0}>
        <Box
          className={styles.historyPane}
          ref={historyPaneRef}
          onScroll={() => {
            const container = historyPaneRef.current;
            if (!container || container.scrollTop > 0 || isLoadingOlder) return;

            void loadOlderMessages();
          }}
        >
          <Box className={styles.content}>
            {selectedSessionId ? (
              <Stack className={styles.history} gap={12}>
                {conversationSegments.map((segment) => (
                  <Stack key={segment.userMessage.id} gap={10}>
                    {segment.userMessage.role === 'user' ? (
                      <Stack className={`${styles.messageStack} ${styles.userStack}`} gap={6}>
                        {renderMessageImages(segment.userMessage.id, segment.userMessage.images, handlePreviewImage)}
                        <Box className={`${styles.message} ${styles.user}`}>
                          <Text className={styles.messageText}>{segment.userMessage.content}</Text>
                        </Box>
                      </Stack>
                    ) : null}

                    {segment.runItems.length
                      ? segment.runItems.map((runItem) => renderRunBlock(runItem.run, runItem.durationText))
                      : null}

                    {segment.assistantMessages.length ? (
                      segment.assistantMessages.map((message) => (
                        <Stack key={message.id} className={`${styles.messageStack} ${styles.assistantStack}`} gap={6}>
                          {renderMessageImages(message.id, message.images, handlePreviewImage)}
                          <Box className={`${styles.inlineMessage} ${styles[message.role]}`}>
                            {renderAssistantContent(message.content)}
                          </Box>
                        </Stack>
                      ))
                    ) : null}
                  </Stack>
                ))}
                {isSubmitting ? (
                  <Box className={styles.thinkingHistory}>
                    <Text className={styles.thinkingHistoryLabel}>Thinking</Text>
                    <Box className={styles.thinkingHistoryLine} />
                    <Text className={styles.thinkingStatus}>Working...</Text>
                  </Box>
                ) : null}
              </Stack>
            ) : (
              <Stack className={styles.suggestions} gap={0}>
                {[
                  'Build an image annotation tool',
                  'Build a browser mini-game',
                  'Connect Browser, GitHub, Linear, and more to Codex',
                ].map((item) => (
                  <Box key={item} className={styles.suggestionRow}>
                    <Text className={styles.suggestionText}>{item}</Text>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Box>

        {previewImage ? (
          <Box className={styles.imagePreviewOverlay} onClick={() => setPreviewImage(null)} role="presentation">
            <Box
              className={styles.imagePreviewFrameLarge}
              onClick={(event) => event.stopPropagation()}
              role="presentation"
            >
              <Image className={styles.imagePreview} src={previewImage} alt="Preview attachment" fill unoptimized />
            </Box>
          </Box>
        ) : null}

        <Box className={styles.composer}>
          {composerAttachments.length ? (
            <Box className={styles.composerAttachments}>
              {composerAttachments.map((attachment) => (
                <Box key={attachment.id} className={styles.composerAttachment}>
                  {attachment.isImage && attachment.previewUrl ? (
                    <Box className={styles.composerAttachmentImageFrame}>
                      <Image
                        className={styles.composerAttachmentImage}
                        src={attachment.previewUrl}
                        alt={attachment.file.name}
                        fill
                        unoptimized
                      />
                    </Box>
                  ) : (
                    <Box className={styles.composerAttachmentFileIcon}>
                      <IconFileText size={14} />
                    </Box>
                  )}
                  <Text className={styles.composerAttachmentLabel}>{attachment.file.name}</Text>
                  <button
                    type="button"
                    className={styles.composerAttachmentRemove}
                    aria-label={`Remove ${attachment.file.name}`}
                    onClick={() => handleRemoveAttachment(attachment.id)}
                  >
                    <IconX size={12} />
                  </button>
                </Box>
              ))}
            </Box>
          ) : null}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.txt,.md,.csv"
            multiple
            className={styles.hiddenFileInput}
            onChange={(event) => handleAddAttachments(event.currentTarget.files)}
          />

          <Textarea
            className={styles.prompt}
            variant="unstyled"
            autosize
            minRows={1}
            maxRows={6}
            placeholder="Ask Codex anything. @ to use plugins or mention files"
            value={draftPrompt}
            onChange={(event) => setDraftPrompt(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSubmitPrompt();
              }
            }}
          />

          <Group className={styles.composerBar} justify="space-between" wrap="nowrap">
            <Group gap={14} wrap="nowrap">
              <Box className={styles.addMenu} ref={addMenuRef}>
                <button
                  type="button"
                  className={styles.addButton}
                  aria-label="Open add menu"
                  onClick={() => setIsAddMenuOpen((current) => !current)}
                >
                  <IconFilePlus size={16} />
                </button>

                {isAddMenuOpen ? (
                  <Box className={styles.addDropdown}>
                    <button
                      type="button"
                      className={styles.addMenuItem}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <IconPaperclip size={14} />
                      <Text className={styles.addMenuLabel}>Add photos &amp; files</Text>
                    </button>
                    <button type="button" className={styles.addMenuItem}>
                      <IconSquareCheck size={14} />
                      <Text className={styles.addMenuLabel}>Include IDE context</Text>
                      <Box className={styles.menuToggleFake} />
                    </button>
                    <button type="button" className={styles.addMenuItem}>
                      <IconSquareCheck size={14} />
                      <Text className={styles.addMenuLabel}>Plan mode</Text>
                      <Box className={styles.menuToggleFake} />
                    </button>
                    <button type="button" className={styles.addMenuItem}>
                      <IconSparkles size={14} />
                      <Text className={styles.addMenuLabel}>Plugins</Text>
                      <Text className={styles.menuArrow}>?</Text>
                    </button>
                  </Box>
                ) : null}
              </Box>

              <Button variant="subtle" className={styles.toolButton} leftSection={<IconPaperclip size={16} />}>
                Full access
              </Button>
            </Group>

            <Group gap={10} wrap="nowrap">
              <Box className={styles.modelPicker} ref={modelPickerRef}>
                <Button
                  variant="subtle"
                  className={styles.modelButton}
                  rightSection={<IconChevronDown size={16} />}
                  onClick={() => {
                    setIsModelMenuOpen((current) => !current);
                    setModelMenuStep('root');
                  }}
                >
                  <Text className={styles.model}>{selectedModel.label}</Text>
                  <Text className={styles.modelMuted}>{selectedModel.detail}</Text>
                </Button>

                {isModelMenuOpen ? (
                  <Box className={styles.modelDropdown}>
                    <Box className={styles.modelColumn}>
                      <Text className={styles.menuTitle}>Intelligence</Text>
                      <Box className={styles.menuList}>
                        {intelligenceLevels.map((level) => (
                          <button key={level} type="button" className={styles.menuItem}>
                            <Text className={styles.menuItemLabel}>{level}</Text>
                            {level === 'Low' ? <Text className={styles.menuItemCheck}>?</Text> : null}
                          </button>
                        ))}
                      </Box>
                    </Box>

                    <Box className={styles.modelColumn}>
                      <Text className={styles.menuTitle}>Model</Text>
                      <Box className={styles.menuList}>
                        {modelVariants.slice(0, 2).map((model) => (
                          <button
                            key={model.id}
                            type="button"
                            className={`${styles.menuItem} ${model.id === selectedModel.id ? styles.menuItemActive : ''}`}
                            onClick={() => {
                              if (model.id === selectedModel.id) {
                                setModelMenuStep('models');
                                return;
                              }

                              onSelectModel(model.id);
                              setIsModelMenuOpen(false);
                              setModelMenuStep('root');
                            }}
                          >
                            <Box>
                              <Text className={styles.menuItemLabel}>{model.label}</Text>
                              <Text className={styles.menuItemSub}>{model.detail}</Text>
                            </Box>
                            <Text className={styles.menuItemArrow}>?</Text>
                          </button>
                        ))}
                        <button type="button" className={styles.menuItem} onClick={() => setModelMenuStep('models')}>
                          <Box>
                            <Text className={styles.menuItemLabel}>Other models</Text>
                          </Box>
                          <Text className={styles.menuItemArrow}>?</Text>
                        </button>
                      </Box>
                    </Box>

                    {modelMenuStep === 'models' ? (
                      <Box className={styles.modelSubmenu}>
                        <Text className={styles.menuTitle}>More Models</Text>
                        <Box className={styles.menuList}>
                          {modelVariants.map((model) => (
                            <button
                              key={model.id}
                              type="button"
                              className={`${styles.menuItem} ${model.id === selectedModel.id ? styles.menuItemActive : ''}`}
                              onClick={() => {
                                onSelectModel(model.id);
                                setIsModelMenuOpen(false);
                                setModelMenuStep('root');
                              }}
                            >
                              <Box>
                                <Text className={styles.menuItemLabel}>{model.label}</Text>
                                <Text className={styles.menuItemSub}>{model.detail}</Text>
                              </Box>
                              {model.id === selectedModel.id ? <Text className={styles.menuItemCheck}>?</Text> : null}
                            </button>
                          ))}
                        </Box>
                      </Box>
                    ) : null}
                  </Box>
                ) : null}
              </Box>

              <IconSparkles size={16} className={styles.iconMuted} />
              <Button
                className={styles.sendButton}
                aria-label={isSubmitting ? 'Stop prompt' : 'Send'}
                onClick={isSubmitting ? handleStopPrompt : handleSubmitPrompt}
                loading={false}
              >
                {isSubmitting ? <IconSquareX size={18} /> : <IconSend2 size={18} />}
              </Button>
            </Group>
          </Group>
        </Box>
      </Stack>
    </Box>
  );
};
