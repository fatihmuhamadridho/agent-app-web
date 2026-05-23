import Head from 'next/head';
import { useRouter } from 'next/router';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type UIEvent,
} from 'react';
import {
  useGetChatHistory,
  useGetSidebarData,
  useSidebarCollapsedPersistence,
  useSidebarCollapsedState,
  useSidebarCollapsedToggle,
} from '@features/Home/infrastructure/home.hook';
import {
  clearPendingPromptHandoff,
  clearAllPendingPromptHandoffs,
  getPendingPromptHandoff,
  savePendingPromptHandoff,
} from '@features/Home/infrastructure/home.pending-prompt';
import { type TerminalHistoryEntry, useTerminalHistory, useTerminalOpenState } from '@features/Home/infrastructure/home.terminal';
import { formatRunDuration } from '../organisms/MainPanelContent.shared';
import { HomeTemplate } from '../templates/Home.template';
import type {
  ChatItemView,
  ChatMessageView,
  ChatHistoryRunView,
  ComposerAttachmentView,
  ConversationSegmentView,
  MainPanelViewProps,
  ModelVariantView,
  NavItemView,
  ProjectGroupView,
  RunTimelineView,
} from '../interfaces/home.interface';

const navItemsBase: NavItemView[] = [
  { label: 'New chat', icon: 'plus' },
  { label: 'Search', icon: 'search' },
  { label: 'Plugins', icon: 'sparkles' },
  { label: 'Automations', icon: 'clock' },
];

const modelVariants: ModelVariantView[] = [
  { id: 'gpt-5.4-mini', label: '5.4-Mini', detail: 'Low' },
  { id: 'gpt-5.4', label: '5.4', detail: 'Balanced' },
  { id: 'gpt-5.2', label: '5.2', detail: 'High' },
];

type ComposerAttachmentState = {
  id: string;
  file: File;
  previewUrl: string | null;
  dataUrl: string | null;
  isImage: boolean;
};

type TerminalStreamSnapshot = {
  jobId: string;
  command: string;
  cwd: string;
  status: TerminalHistoryEntry['status'];
  output: string;
  exitCode: number | null;
  errorMessage: string | null;
};

const isImageFile = (file: File) => file.type.startsWith('image/');
const createRunStepId = (runId: string, type: string, timestamp: number) => `${runId}-${type}-${timestamp}`;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

const buildInitialRunDraft = (runId: string, startedAt: number, detail: string): ChatHistoryRunView => ({
  id: runId,
  status: 'running',
  startedAt,
  endedAt: null,
  steps: [
    {
      id: createRunStepId(runId, 'run.started', startedAt),
      type: 'run.started',
      label: 'Run started',
      detail,
      timestamp: startedAt,
    },
  ],
  commands: [],
  files: [],
  assistantMessages: [],
});

const HomePage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data } = useGetSidebarData();
  const [newChatResetCounter, setNewChatResetCounter] = useState(0);
  const isSidebarCollapsed = useSidebarCollapsedState();
  useSidebarCollapsedPersistence(isSidebarCollapsed);
  const handleToggleSidebar = useSidebarCollapsedToggle(isSidebarCollapsed);
  const selectedSessionId =
    typeof router.query.sessionId === 'string'
      ? router.query.sessionId
      : Array.isArray(router.query.sessionId)
        ? router.query.sessionId[0]
        : undefined;
  const isLandingPage = router.pathname === '/';

  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [composerAttachments, setComposerAttachments] = useState<ComposerAttachmentState[]>([]);
  const [draftPrompt, setDraftPrompt] = useState('');
  const [draftTerminalCommand, setDraftTerminalCommand] = useState('pnpm lint');
  const [isTerminalOpen, setTerminalOpen] = useTerminalOpenState();
  const { history: terminalHistory, persistHistory } = useTerminalHistory(selectedSessionId);
  const [isTerminalSubmitting, setIsTerminalSubmitting] = useState(false);
  const [terminalError, setTerminalError] = useState<string | null>(null);
  const [olderMessages, setOlderMessages] = useState<ChatMessageView[]>([]);
  const [localMessages, setLocalMessages] = useState<ChatMessageView[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [streamRunDraft, setStreamRunDraft] = useState<ChatHistoryRunView | null>(null);
  const { data: chatHistoryData } = useGetChatHistory(selectedSessionId);

  const promptAbortControllerRef = useRef<AbortController | null>(null);
  const historyPaneRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const addMenuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const modelPickerRef = useRef<HTMLDivElement | null>(null);
  const terminalOutputRef = useRef<HTMLDivElement | null>(null);
  const terminalEventSourceRef = useRef<EventSource | null>(null);
  const composerAttachmentsRef = useRef<ComposerAttachmentState[]>([]);
  const isPrependingOlderRef = useRef(false);
  const hasMoreBeforeRef = useRef(false);
  const nextBeforeIndexRef = useRef<number | null>(null);
  const shouldScrollToBottomRef = useRef(true);
  const streamEventSourceRef = useRef<EventSource | null>(null);
  const streamAssistantMessageIdRef = useRef<string | null>(null);

  const handleSelectSession = useCallback((sessionId: string) => {
    void router.push(`/c/${encodeURIComponent(sessionId)}`);
  }, [router]);

  const handleNewChat = () => {
    clearAllPendingPromptHandoffs();
    setNewChatResetCounter((current) => current + 1);
    void router.push('/');
  };

  const navItems = useMemo(
    () =>
      navItemsBase.map((item) => ({
        ...item,
        active: item.label === 'New chat' ? isLandingPage : false,
      })),
    [isLandingPage]
  );

  const projectGroups: ProjectGroupView[] = useMemo(
    () =>
      data?.projectGroups?.map((group) => ({
        id: group.id,
        label: group.label,
        sessions: group.sessions.map((session) => ({
          id: session.id,
          label: session.label,
          time: session.time,
          active: session.id === selectedSessionId,
        })),
      })) ?? [],
    [data?.projectGroups, selectedSessionId]
  );

  const chats: ChatItemView[] = useMemo(
    () =>
      data?.chats?.map((chat) => ({
        id: chat.id,
        label: chat.label,
        time: chat.time,
        active: chat.id === selectedSessionId,
      })) ?? [],
    [data?.chats, selectedSessionId]
  );

  const selectedModel = modelVariants[0];
  const mainPanelKey = `${selectedSessionId ?? 'landing'}-${newChatResetCounter}`;
  const baseMessages = useMemo(() => chatHistoryData?.messages ?? [], [chatHistoryData?.messages]);
  const baseRuns = useMemo(() => chatHistoryData?.runs ?? [], [chatHistoryData?.runs]);

  useEffect(() => {
    composerAttachmentsRef.current = composerAttachments;
  }, [composerAttachments]);

  useEffect(() => {
    hasMoreBeforeRef.current = Boolean(chatHistoryData?.hasMoreBefore);
    nextBeforeIndexRef.current = chatHistoryData?.nextBeforeIndex ?? null;
  }, [chatHistoryData?.hasMoreBefore, chatHistoryData?.nextBeforeIndex]);

  useEffect(() => {
    window.setTimeout(() => {
      setOlderMessages([]);
    }, 0);
  }, [selectedSessionId]);

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

  const displayedRuns = useMemo(() => {
    const orderedBaseRuns = [...baseRuns].sort((left, right) => left.startedAt - right.startedAt);
    if (!streamRunDraft) return orderedBaseRuns;

    const filteredBaseRuns = orderedBaseRuns.filter((run) => run.id !== streamRunDraft.id);
    return [...filteredBaseRuns, streamRunDraft];
  }, [baseRuns, streamRunDraft]);

  const conversationSegments = useMemo<ConversationSegmentView[]>(() => {
    const segments: ConversationSegmentView[] = [];
    let activeSegment: ConversationSegmentView | null = null;

    displayedMessages.forEach((message) => {
      if (message.role === 'user') {
        activeSegment = {
          id: message.id,
          userMessage: message,
          assistantMessages: [],
          runItems: [],
        };
        segments.push(activeSegment);
        return;
      }

      if (message.role === 'assistant' && activeSegment) {
        activeSegment.assistantMessages.push(message);
      }
    });

    const runsByAnchorMessageId = new Map<string, RunTimelineView[]>();
    const assignedRunIds = new Set<string>();

    displayedRuns.forEach((run, index) => {
      const item: RunTimelineView = {
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

    segments.forEach((segment) => {
      const runItems = segment.userMessage ? runsByAnchorMessageId.get(segment.userMessage.id) : undefined;
      if (!runItems) return;
      segment.runItems = [...runItems].sort((left, right) => left.run.startedAt - right.run.startedAt);
    });

    const fallbackSegments = segments.filter((segment) => segment.runItems.length === 0);
    let fallbackIndex = 0;

    displayedRuns.forEach((run, index) => {
      if (assignedRunIds.has(run.id)) return;
      const segment = fallbackSegments[fallbackIndex];
      if (!segment) return;

      segment.runItems = [
        {
          run,
          durationText: formatRunDuration(run.startedAt, run.endedAt),
          isLatest: index === displayedRuns.length - 1,
        },
      ];
      fallbackIndex += 1;
    });

    return segments;
  }, [displayedMessages, displayedRuns]);

  const leadingAssistantMessages = useMemo(() => {
    const messages: ChatMessageView[] = [];
    for (const message of displayedMessages) {
      if (message.role === 'user') break;
      if (message.role === 'assistant') messages.push(message);
    }
    return messages;
  }, [displayedMessages]);

  const clearComposerAttachments = useCallback(() => {
    composerAttachmentsRef.current.forEach((attachment) => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    });
    setComposerAttachments([]);
  }, []);

  useEffect(() => {
    return () => {
      composerAttachmentsRef.current.forEach((attachment) => {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      });
    };
  }, []);

  const handleAddAttachments = useCallback((files: FileList | File[] | null) => {
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
          } satisfies ComposerAttachmentState;
        })
      );

      setComposerAttachments((current) => [...current, ...incomingAttachments]);
      setIsAddMenuOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    })();
  }, []);

  const handleComposerPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedFiles = Array.from(event.clipboardData.files ?? []).filter((file) => file.size > 0);
    if (!pastedFiles.length) return;
    event.preventDefault();
    handleAddAttachments(pastedFiles);
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

  const loadOlderMessages = useCallback(async () => {
    if (!selectedSessionId || isPrependingOlderRef.current || !hasMoreBeforeRef.current) return;

    isPrependingOlderRef.current = true;
    setIsLoadingOlder(true);
    const container = historyPaneRef.current;
    const previousHeight = container?.scrollHeight ?? 0;

    try {
      const response = await fetch(
        `/api/home/sidebar/${encodeURIComponent(selectedSessionId)}?limit=20&beforeIndex=${nextBeforeIndexRef.current ?? ''}`
      );
      if (!response.ok) return;

      const payload = (await response.json()) as {
        messages?: ChatMessageView[];
        hasMoreBefore?: boolean;
        nextBeforeIndex?: number | null;
      };

      setOlderMessages((current) => [...(payload.messages ?? []), ...current]);
      hasMoreBeforeRef.current = Boolean(payload.hasMoreBefore);
      nextBeforeIndexRef.current = payload.nextBeforeIndex ?? null;

      requestAnimationFrame(() => {
        if (!container) return;
        const nextHeight = container.scrollHeight;
        container.scrollTop = nextHeight - previousHeight;
      });
    } finally {
      isPrependingOlderRef.current = false;
      setIsLoadingOlder(false);
    }
  }, [selectedSessionId]);

  const appendRunStepDraft = useCallback((step: ChatHistoryRunView['steps'][number]) => {
    setStreamRunDraft((current) => {
      if (!current) return current;
      return { ...current, steps: [...current.steps, step] };
    });
  }, []);

  const pushStreamActivity = useCallback((activity: Record<string, unknown>) => {
    setStreamRunDraft((current) => {
      if (!current) return current;

      if (activity.type === 'tool.command.started') {
        const command = String(activity.command ?? '');
        const existing = current.commands.find((item) => item.command === command && item.status === 'in_progress');
        if (existing) return current;

        return {
          ...current,
          commands: [
            ...current.commands,
            {
              id: `${current.id}-command-${current.commands.length}-${Date.now()}`,
              command,
              status: 'in_progress',
              timestamp: Date.now(),
            },
          ],
        };
      }

      if (activity.type === 'tool.command.completed') {
        const command = String(activity.command ?? '');
        const nextCommands = [...current.commands];
        const targetIndex = nextCommands.findIndex((item) => item.command === command && item.status === 'in_progress');
        if (targetIndex >= 0) {
          nextCommands[targetIndex] = {
            ...nextCommands[targetIndex],
            status: activity.status === 'failed' ? 'failed' : 'completed',
            output: typeof activity.output === 'string' ? activity.output : undefined,
            exitCode: typeof activity.exitCode === 'number' ? activity.exitCode : undefined,
          };
        } else {
          nextCommands.push({
            id: `${current.id}-command-${nextCommands.length}-${Date.now()}`,
            command,
            status: activity.status === 'failed' ? 'failed' : 'completed',
            output: typeof activity.output === 'string' ? activity.output : undefined,
            exitCode: typeof activity.exitCode === 'number' ? activity.exitCode : undefined,
            timestamp: Date.now(),
          });
        }

        return { ...current, commands: nextCommands };
      }

      if (activity.type === 'file.created' || activity.type === 'file.updated') {
        return {
          ...current,
          files: [
            ...current.files,
            {
              id: `${current.id}-file-${current.files.length}-${Date.now()}`,
              path: String(activity.path ?? ''),
              kind: activity.type,
              status: activity.type === 'file.created' ? 'created' : 'updated',
              timestamp: Date.now(),
            },
          ],
        };
      }

      if (activity.type === 'chat.done') {
        return {
          ...current,
          status: 'done',
          endedAt: Date.now(),
        };
      }

      if (activity.type === 'chat.error') {
        return {
          ...current,
          status: 'error',
          endedAt: Date.now(),
        };
      }

      return current;
    });
  }, []);

  const startPromptStream = useCallback(
    ({ jobId, streamSessionId, startedAt }: { jobId: string; streamSessionId?: string; startedAt: number }) => {
      setStreamRunDraft(buildInitialRunDraft(jobId, startedAt, streamSessionId ?? selectedSessionId ?? 'new session'));
      const eventSource = new EventSource(`/api/home/prompt/stream?jobId=${encodeURIComponent(jobId)}`);
      streamEventSourceRef.current = eventSource;

      eventSource.addEventListener('turn.started', (event) => {
        const payload = JSON.parse((event as MessageEvent).data as string) as { sessionId?: string };
        appendRunStepDraft({
          id: createRunStepId(jobId, 'turn.started', Date.now()),
          type: 'turn.started',
          label: 'Turn started',
          detail: 'assistant is processing the prompt',
          timestamp: Date.now(),
        });
        if (payload.sessionId && payload.sessionId !== selectedSessionId) {
          handleSelectSession(payload.sessionId);
        }
      });

      ['item.started', 'item.updated', 'item.completed'].forEach((eventName) => {
        eventSource.addEventListener(eventName, (event) => {
          const payload = JSON.parse((event as MessageEvent).data as string) as { item?: { type?: string }; sessionId?: string };
          const itemType = payload.item?.type ?? 'unknown';
          appendRunStepDraft({
            id: createRunStepId(jobId, `${eventName}-${itemType}`, Date.now()),
            type: eventName as ChatHistoryRunView['steps'][number]['type'],
            label:
              itemType === 'command_execution'
                ? `Command ${eventName.split('.')[1]}`
                : itemType === 'file_change'
                  ? `File change ${eventName.split('.')[1]}`
                  : `Item ${eventName.split('.')[1]}`,
            detail: itemType,
            timestamp: Date.now(),
          });
          if (payload.sessionId && payload.sessionId !== selectedSessionId) {
            handleSelectSession(payload.sessionId);
          }
        });
      });

      eventSource.addEventListener('tool.command.started', (event) => {
        const payload = JSON.parse((event as MessageEvent).data as string) as { command?: string };
        pushStreamActivity({ type: 'tool.command.started', command: payload.command ?? '' });
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
          command: payload.command ?? '',
          status: payload.status === 'failed' ? 'failed' : 'completed',
          exitCode: payload.exitCode,
          output: payload.output,
        });
      });

      eventSource.addEventListener('file.created', (event) => {
        const payload = JSON.parse((event as MessageEvent).data as string) as { path?: string };
        pushStreamActivity({ type: 'file.created', path: payload.path ?? '' });
      });

      eventSource.addEventListener('file.updated', (event) => {
        const payload = JSON.parse((event as MessageEvent).data as string) as { path?: string };
        pushStreamActivity({ type: 'file.updated', path: payload.path ?? '' });
      });

      eventSource.addEventListener('chat.update', (event) => {
        const payload = JSON.parse((event as MessageEvent).data as string) as { sessionId?: string; text?: string };
        if (payload.sessionId && payload.sessionId !== selectedSessionId) {
          handleSelectSession(payload.sessionId);
        }
        if (streamAssistantMessageIdRef.current) {
          setLocalMessages((current) =>
            current.map((message) =>
              message.id === streamAssistantMessageIdRef.current ? { ...message, content: payload.text ?? message.content } : message
            )
          );
        }
        shouldScrollToBottomRef.current = true;
      });

      eventSource.addEventListener('chat.done', (event) => {
        const payload = JSON.parse((event as MessageEvent).data as string) as { sessionId?: string; text?: string };
        if (streamAssistantMessageIdRef.current) {
          setLocalMessages((current) =>
            current.map((message) =>
              message.id === streamAssistantMessageIdRef.current ? { ...message, content: payload.text ?? message.content } : message
            )
          );
        }
        if (payload.sessionId && payload.sessionId !== selectedSessionId) {
          handleSelectSession(payload.sessionId);
        }
        if (payload.sessionId) {
          clearPendingPromptHandoff(payload.sessionId);
        }
        pushStreamActivity({ type: 'chat.done' });
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
        const payload = JSON.parse((event as MessageEvent).data as string) as { message?: string; sessionId?: string };
        eventSource.close();
        if (streamEventSourceRef.current === eventSource) {
          streamEventSourceRef.current = null;
        }
        if (payload.sessionId) {
          clearPendingPromptHandoff(payload.sessionId);
        }
        pushStreamActivity({ type: 'chat.error' });
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
        if (streamSessionId) {
          clearPendingPromptHandoff(streamSessionId);
        }
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
    },
    [appendRunStepDraft, handleSelectSession, pushStreamActivity, queryClient, selectedSessionId]
  );

  useEffect(() => {
    if (!selectedSessionId || streamEventSourceRef.current) return;
    const pendingPrompt = getPendingPromptHandoff(selectedSessionId);
    if (!pendingPrompt) return;

    const resumePendingPrompt = window.requestAnimationFrame(() => {
      streamAssistantMessageIdRef.current = pendingPrompt.assistantMessage.id;
      setLocalMessages([pendingPrompt.userMessage as ChatMessageView, pendingPrompt.assistantMessage as ChatMessageView]);
      setIsSubmitting(true);
      startPromptStream({
        jobId: pendingPrompt.jobId,
        streamSessionId: pendingPrompt.sessionId,
        startedAt: pendingPrompt.startedAt,
      });
    });

    return () => window.cancelAnimationFrame(resumePendingPrompt);
  }, [selectedSessionId, startPromptStream]);

  const handleSubmitPrompt = async () => {
    const prompt = draftPrompt.trim();
    if ((!prompt && composerAttachments.length === 0) || isSubmitting) return;

    const abortController = new AbortController();
    promptAbortControllerRef.current = abortController;

    const nextMessage: ChatMessageView = {
      id: `${selectedSessionId ?? 'new'}-${Date.now()}`,
      role: 'user',
      content: prompt,
      images: composerAttachments.filter((attachment) => attachment.isImage && attachment.dataUrl).map((attachment) => attachment.dataUrl as string),
    };

    const assistantMessageId = `${selectedSessionId ?? 'new'}-assistant-${Date.now()}`;
    streamAssistantMessageIdRef.current = assistantMessageId;
    setLocalMessages((current) => [...current, nextMessage, { id: assistantMessageId, role: 'assistant', content: '' }]);
    setDraftPrompt('');
    clearComposerAttachments();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/home/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          sessionId: selectedSessionId,
          prompt,
          model: selectedModel.id,
          images: composerAttachments.filter((attachment) => attachment.isImage && attachment.dataUrl).map((attachment) => attachment.dataUrl as string),
        }),
      });

      const payload = (await response.json()) as { jobId?: string; sessionId?: string };
      if (!response.ok || !payload.jobId || !payload.sessionId) {
        throw new Error('Failed to start prompt stream');
      }

      const startedAt = Date.now();
      if (!selectedSessionId) {
        savePendingPromptHandoff({
          jobId: payload.jobId,
          sessionId: payload.sessionId,
          runId: payload.jobId,
          startedAt,
          userMessage: nextMessage,
          assistantMessage: { id: assistantMessageId, role: 'assistant', content: '' },
        });
        handleSelectSession(payload.sessionId);
        return;
      }

      startPromptStream({ jobId: payload.jobId, streamSessionId: payload.sessionId, startedAt });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;

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

  const appendTerminalHistory = (entry: Omit<TerminalHistoryEntry, 'createdAt'>) => {
    persistHistory((current) => {
      const next = [...current, { ...entry, createdAt: Date.now() }];
      return next.slice(-20);
    });
  };

  const updateTerminalHistory = (jobId: string, updater: (entry: TerminalHistoryEntry) => TerminalHistoryEntry) => {
    persistHistory((current) => current.map((entry) => (entry.id === jobId ? updater(entry) : entry)));
  };

  const handleTerminalStream = (jobId: string) => {
    const eventSource = new EventSource(`/api/home/terminal/stream?jobId=${encodeURIComponent(jobId)}`);
    terminalEventSourceRef.current = eventSource;

    eventSource.addEventListener('snapshot', (event) => {
      const payload = JSON.parse((event as MessageEvent).data as string) as TerminalStreamSnapshot;
      updateTerminalHistory(jobId, (entry) => ({
        ...entry,
        command: payload.command,
        output: payload.output,
        status: payload.status,
        exitCode: payload.exitCode,
        errorMessage: payload.errorMessage,
      }));
    });

    eventSource.addEventListener('output', (event) => {
      const payload = JSON.parse((event as MessageEvent).data as string) as { jobId: string; chunk: string };
      updateTerminalHistory(payload.jobId, (entry) => ({ ...entry, output: `${entry.output}${payload.chunk}` }));
    });

    eventSource.addEventListener('completed', (event) => {
      const payload = JSON.parse((event as MessageEvent).data as string) as { jobId: string; exitCode: number | null };
      updateTerminalHistory(payload.jobId, (entry) => ({
        ...entry,
        status: payload.exitCode === 0 ? 'completed' : 'failed',
        exitCode: payload.exitCode,
      }));
      setIsTerminalSubmitting(false);
      eventSource.close();
      if (terminalEventSourceRef.current === eventSource) {
        terminalEventSourceRef.current = null;
      }
    });

    eventSource.addEventListener('failed', (event) => {
      const payload = JSON.parse((event as MessageEvent).data as string) as { jobId: string; message: string; exitCode: number | null };
      updateTerminalHistory(payload.jobId, (entry) => ({
        ...entry,
        status: 'failed',
        errorMessage: payload.message,
        exitCode: payload.exitCode,
      }));
      setTerminalError(payload.message);
      setIsTerminalSubmitting(false);
      eventSource.close();
      if (terminalEventSourceRef.current === eventSource) {
        terminalEventSourceRef.current = null;
      }
    });

    eventSource.onerror = () => {
      setTerminalError('Terminal stream disconnected unexpectedly');
      setIsTerminalSubmitting(false);
      eventSource.close();
      if (terminalEventSourceRef.current === eventSource) {
        terminalEventSourceRef.current = null;
      }
    };
  };

  const handleTerminalSubmit = async () => {
    const command = draftTerminalCommand.trim();
    if (!command || isTerminalSubmitting) return;

    setTerminalError(null);
    setIsTerminalSubmitting(true);
    const response = await fetch('/api/home/terminal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });

    const payload = (await response.json()) as { jobId?: string; error?: string };
    if (!response.ok || !payload.jobId) {
      setTerminalError(payload.error ?? 'Failed to start terminal command');
      setIsTerminalSubmitting(false);
      return;
    }

    appendTerminalHistory({
      id: payload.jobId,
      command,
      output: '',
      status: 'running',
      exitCode: null,
      errorMessage: null,
    });
    setDraftTerminalCommand('');
    handleTerminalStream(payload.jobId);
  };

  const handleComposerKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmitPrompt();
    }
  };

  const handleHistoryScroll = (event: UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    if (container.scrollTop > 0 || isLoadingOlder) return;
    void loadOlderMessages();
  };

  useLayoutEffect(() => {
    const composer = composerRef.current;
    const historyPane = historyPaneRef.current;
    const body = bodyRef.current;
    if (!composer || !historyPane || !body) return;

    const updateComposerFootprint = () => {
      const composerHeight = Math.ceil(composer.getBoundingClientRect().height);
      const composerFootprint = composerHeight + 24;
      body.style.setProperty('--composer-footprint', `${composerFootprint}px`);
      historyPane.style.setProperty('--history-pane-bottom-buffer', `${composerFootprint}px`);
    };

    updateComposerFootprint();

    const observer = new ResizeObserver(() => updateComposerFootprint());
    observer.observe(composer);
    return () => observer.disconnect();
  }, [composerAttachments.length, draftPrompt, isAddMenuOpen, isModelMenuOpen, isTerminalOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewImage(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideAddMenu = Boolean(addMenuRef.current?.contains(target));
      const clickedInsideModelMenu = Boolean(modelPickerRef.current?.contains(target));

      if (!clickedInsideAddMenu) {
        setIsAddMenuOpen(false);
      }

      if (!clickedInsideModelMenu) {
        setIsModelMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!isTerminalOpen) {
      terminalEventSourceRef.current?.close();
      terminalEventSourceRef.current = null;
      window.setTimeout(() => setIsTerminalSubmitting(false), 0);
      return;
    }

    terminalOutputRef.current?.scrollTo({ top: terminalOutputRef.current.scrollHeight });
  }, [isTerminalOpen, terminalHistory]);

  useEffect(() => {
    if (!shouldScrollToBottomRef.current) return;
    const container = historyPaneRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
    shouldScrollToBottomRef.current = false;
  }, [displayedMessages, displayedRuns, isSubmitting]);

  const composerAttachmentsView: ComposerAttachmentView[] = useMemo(
    () =>
      composerAttachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.file.name,
        previewUrl: attachment.previewUrl,
        dataUrl: attachment.dataUrl,
        isImage: attachment.isImage,
      })),
    [composerAttachments]
  );

  const mainPanelView: MainPanelViewProps = {
    selectedSessionId,
    title: chatHistoryData?.title || 'What should we work on?',
    isLandingPage,
    previewImage,
    leadingAssistantMessages,
    conversationSegments,
    isLoadingOlder,
    isPromptSubmitting: isSubmitting,
    composer: {
      draftPrompt,
      attachments: composerAttachmentsView,
      selectedModel,
      modelVariants,
      isSubmitting,
      isAddMenuOpen,
      isModelMenuOpen,
    },
    terminal: {
      isOpen: isTerminalOpen,
      isSubmitting: isTerminalSubmitting,
      draftCommand: draftTerminalCommand,
      error: terminalError,
      entries: terminalHistory,
    },
  };

  return (
    <>
      <Head>
        <title>Home | agent-app-web</title>
        <meta name="description" content="Agent-style home dashboard shell" />
      </Head>
      <HomeTemplate
        navItems={navItems}
        projectGroups={projectGroups}
        chats={chats}
        mainPanelKey={mainPanelKey}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        mainPanel={mainPanelView}
        bodyRef={bodyRef}
        historyPaneRef={historyPaneRef}
        composerRef={composerRef}
        addMenuRef={addMenuRef}
        fileInputRef={fileInputRef}
        modelPickerRef={modelPickerRef}
        terminalOutputRef={terminalOutputRef}
        onHistoryScroll={handleHistoryScroll}
        onPreviewImage={setPreviewImage}
        onClosePreviewImage={() => setPreviewImage(null)}
        onToggleTerminal={() => setTerminalOpen(!isTerminalOpen)}
        onDraftTerminalCommandChange={setDraftTerminalCommand}
        onRunTerminalCommand={() => {
          void handleTerminalSubmit();
        }}
        onDraftPromptChange={setDraftPrompt}
        onComposerPaste={handleComposerPaste}
        onComposerKeyDown={handleComposerKeyDown}
        onFileInputChange={(event: ChangeEvent<HTMLInputElement>) => handleAddAttachments(event.target.files)}
        onToggleAddMenu={() => setIsAddMenuOpen((current) => !current)}
        onOpenFilePicker={() => fileInputRef.current?.click()}
        onToggleModelMenu={() => setIsModelMenuOpen((current) => !current)}
        onRemoveAttachment={handleRemoveAttachment}
        onSubmitPrompt={() => {
          void handleSubmitPrompt();
        }}
        onStopPrompt={handleStopPrompt}
      />
    </>
  );
};

export default HomePage;
