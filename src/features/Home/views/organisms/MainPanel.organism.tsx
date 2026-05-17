import { Box, Button, Group, Stack, Text, Textarea } from '@mantine/core';
import { IconChevronDown, IconPaperclip, IconSend2, IconSparkles } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGetChatHistory } from '@features/Home/infrastructure/home.hook';
import type { ChatMessageView, ModelVariantView } from '../interfaces/home.interface';
import styles from './MainPanel.module.scss';

type MainPanelProps = {
  selectedSessionId?: string;
  modelVariants: ModelVariantView[];
  selectedModel: ModelVariantView;
  onSelectModel: (modelId: string) => void;
  onSelectSession?: (sessionId: string) => void;
};

export const MainPanel = ({
  selectedSessionId,
  modelVariants,
  selectedModel,
  onSelectModel,
  onSelectSession,
}: MainPanelProps) => {
  const { data: chatHistoryData } = useGetChatHistory(selectedSessionId);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState('');
  const [olderMessages, setOlderMessages] = useState<ChatMessageView[]>([]);
  const [localMessages, setLocalMessages] = useState<ChatMessageView[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState('');
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [modelMenuStep, setModelMenuStep] = useState<'root' | 'models'>('root');
  const historyPaneRef = useRef<HTMLDivElement | null>(null);
  const isPrependingOlderRef = useRef(false);
  const hasMoreBeforeRef = useRef(false);
  const nextBeforeIndexRef = useRef<number | null>(null);
  const shouldScrollToBottomRef = useRef(true);
  const intelligenceLevels = ['Low', 'Medium', 'High', 'Extra High'] as const;
  const baseMessages = useMemo(() => chatHistoryData?.messages ?? [], [chatHistoryData?.messages]);
  const displayedMessages = useMemo(() => [...olderMessages, ...baseMessages, ...localMessages], [olderMessages, baseMessages, localMessages]);

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

  const loadOlderMessages = async () => {
    if (!selectedSessionId || !hasMoreBeforeRef.current || isLoadingOlder || nextBeforeIndexRef.current === null) return;

    setIsLoadingOlder(true);
    isPrependingOlderRef.current = true;
    shouldScrollToBottomRef.current = false;

    try {
      const response = await fetch(
        `/api/home/sidebar/${selectedSessionId}?limit=12&beforeIndex=${encodeURIComponent(String(nextBeforeIndexRef.current))}`,
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
    if (!prompt || isSubmitting) return;

    const nextMessage: ChatMessageView = {
      id: `${selectedSessionId ?? 'new'}-${Date.now()}`,
      role: 'user',
      content: prompt,
    };

    setLocalMessages((current) => [...current, nextMessage]);
    setDraftPrompt('');
    setPendingPrompt(prompt);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/home/prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          prompt,
          model: selectedModel.id,
        }),
      });

      const data = (await response.json()) as {
        sessionId?: string;
        assistantMessage?: string;
      };

      if (!response.ok) {
        throw new Error(data.assistantMessage || 'Failed to send prompt');
      }

      const assistantMessage: ChatMessageView = {
        id: `${data.sessionId ?? selectedSessionId ?? 'new'}-assistant-${Date.now()}`,
        role: 'assistant',
        content: data.assistantMessage ?? '',
      };

      if (data.sessionId && data.sessionId !== selectedSessionId) {
        onSelectSession?.(data.sessionId);
      }

      setLocalMessages((current) => [...current, assistantMessage]);
      shouldScrollToBottomRef.current = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send prompt';
      setLocalMessages((current) => [
        ...current,
        {
          id: `${selectedSessionId ?? 'new'}-error-${Date.now()}`,
          role: 'system',
          content: errorMessage,
        },
      ]);
    } finally {
      setIsSubmitting(false);
      setPendingPrompt('');
    }
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
                {displayedMessages.map((message) =>
                  message.role === 'user' ? (
                    <Box key={message.id} className={`${styles.message} ${styles.user}`}>
                      <Text className={styles.messageText}>{message.content}</Text>
                    </Box>
                  ) : (
                    <Text key={message.id} className={`${styles.inlineMessage} ${styles[message.role]}`}>
                      {message.content}
                    </Text>
                  ),
                )}
                {isSubmitting ? (
                  <Box className={styles.thinkingHistory}>
                    <Text className={styles.thinkingHistoryLabel}>Thinking</Text>
                    <Box className={styles.thinkingHistoryLine} />
                    {pendingPrompt ? <Text className={styles.inlineMessage}>{pendingPrompt}</Text> : null}
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

        <Box className={styles.composer}>
          <Textarea
            className={styles.prompt}
            variant="unstyled"
            autosize
            minRows={2}
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
              <Button variant="subtle" className={styles.toolButton} leftSection={<IconPaperclip size={16} />}>
                Full access
              </Button>
            </Group>

            <Group gap={10} wrap="nowrap">
              <Box className={styles.modelPicker}>
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
              <Button className={styles.sendButton} aria-label="Send" onClick={handleSubmitPrompt} loading={isSubmitting}>
                <IconSend2 size={18} />
              </Button>
            </Group>
          </Group>
        </Box>
      </Stack>
    </Box>
  );
};

