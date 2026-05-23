import { Box, Group, Stack, Text } from '@mantine/core';
import { IconTerminal2 } from '@tabler/icons-react';
import Image from 'next/image';
import type { ChangeEvent, ClipboardEvent, KeyboardEvent, RefObject, UIEvent } from 'react';
import { ComposerPanel } from './ComposerPanel.organism';
import { ConversationTimeline } from './ConversationTimeline.organism';
import { TerminalDrawer } from './TerminalDrawer.organism';
import type { MainPanelViewProps } from '../interfaces/home.interface';
import styles from './MainPanel.module.scss';

type MainPanelProps = {
  view: MainPanelViewProps;
  bodyRef: RefObject<HTMLDivElement | null>;
  historyPaneRef: RefObject<HTMLDivElement | null>;
  composerRef: RefObject<HTMLDivElement | null>;
  addMenuRef: RefObject<HTMLDivElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  modelPickerRef: RefObject<HTMLDivElement | null>;
  terminalOutputRef: RefObject<HTMLDivElement | null>;
  onHistoryScroll: (event: UIEvent<HTMLDivElement>) => void;
  onPreviewImage: (image: string) => void;
  onClosePreviewImage: () => void;
  onToggleTerminal: () => void;
  onDraftTerminalCommandChange: (value: string) => void;
  onRunTerminalCommand: () => void;
  onDraftPromptChange: (value: string) => void;
  onComposerPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  onComposerKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleAddMenu: () => void;
  onOpenFilePicker: () => void;
  onToggleModelMenu: () => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onSubmitPrompt: () => void;
  onStopPrompt: () => void;
};

export const MainPanel = ({
  view,
  bodyRef,
  historyPaneRef,
  composerRef,
  addMenuRef,
  fileInputRef,
  modelPickerRef,
  terminalOutputRef,
  onHistoryScroll,
  onPreviewImage,
  onClosePreviewImage,
  onToggleTerminal,
  onDraftTerminalCommandChange,
  onRunTerminalCommand,
  onDraftPromptChange,
  onComposerPaste,
  onComposerKeyDown,
  onFileInputChange,
  onToggleAddMenu,
  onOpenFilePicker,
  onToggleModelMenu,
  onRemoveAttachment,
  onSubmitPrompt,
  onStopPrompt,
}: MainPanelProps) => {
  return (
    <Box className={styles.panel}>
      {!view.isLandingPage ? (
        <Box className={styles.toolbar}>
          <Text className={styles.threadTitle}>{view.title}</Text>
          <Group gap={8} wrap="nowrap">
            <button
              type="button"
              className={styles.toolbarIconButton}
              aria-label={view.terminal.isOpen ? 'Close terminal' : 'Open terminal'}
              onClick={onToggleTerminal}
            >
              <IconTerminal2 size={16} />
            </button>
            <Box className={styles.toolbarDot} />
          </Group>
        </Box>
      ) : null}

      {!view.isLandingPage ? (
        <Stack className={styles.body} gap={0} ref={bodyRef}>
          <Box className={styles.historyPane} ref={historyPaneRef} onScroll={onHistoryScroll}>
            <ConversationTimeline
              leadingAssistantMessages={view.leadingAssistantMessages}
              conversationSegments={view.conversationSegments}
              isPromptSubmitting={view.isPromptSubmitting}
              onPreviewImage={onPreviewImage}
            />
          </Box>

          {view.previewImage ? (
            <Box className={styles.imagePreviewOverlay} onClick={onClosePreviewImage} role="presentation">
              <Box className={styles.imagePreviewFrameLarge} onClick={(event) => event.stopPropagation()} role="presentation">
                <Image className={styles.imagePreview} src={view.previewImage} alt="Preview attachment" fill unoptimized />
              </Box>
            </Box>
          ) : null}

          <TerminalDrawer
            selectedSessionId={view.selectedSessionId}
            terminal={view.terminal}
            terminalOutputRef={terminalOutputRef}
            onToggleTerminal={onToggleTerminal}
            onDraftCommandChange={onDraftTerminalCommandChange}
            onRunCommand={onRunTerminalCommand}
          />

          <ComposerPanel
            composer={view.composer}
            fileInputRef={fileInputRef}
            composerRef={composerRef}
            addMenuRef={addMenuRef}
            modelPickerRef={modelPickerRef}
            onDraftPromptChange={onDraftPromptChange}
            onComposerPaste={onComposerPaste}
            onComposerKeyDown={onComposerKeyDown}
            onFileInputChange={onFileInputChange}
            onToggleAddMenu={onToggleAddMenu}
            onOpenFilePicker={onOpenFilePicker}
            onToggleModelMenu={onToggleModelMenu}
            onRemoveAttachment={onRemoveAttachment}
            onPreviewImage={onPreviewImage}
            onSubmitPrompt={onSubmitPrompt}
            onStopPrompt={onStopPrompt}
          />
        </Stack>
      ) : (
        <Box className={styles.landingStage}>
          <Stack className={styles.landingStageInner} gap={28}>
            <Text className={styles.landingTitle}>What should we build in agent-app-web?</Text>
            <ComposerPanel
              composer={view.composer}
              fileInputRef={fileInputRef}
              composerRef={composerRef}
              addMenuRef={addMenuRef}
              modelPickerRef={modelPickerRef}
              variant="landing"
              onDraftPromptChange={onDraftPromptChange}
              onComposerPaste={onComposerPaste}
              onComposerKeyDown={onComposerKeyDown}
              onFileInputChange={onFileInputChange}
              onToggleAddMenu={onToggleAddMenu}
              onOpenFilePicker={onOpenFilePicker}
              onToggleModelMenu={onToggleModelMenu}
              onRemoveAttachment={onRemoveAttachment}
              onPreviewImage={onPreviewImage}
              onSubmitPrompt={onSubmitPrompt}
              onStopPrompt={onStopPrompt}
            />
          </Stack>
        </Box>
      )}
    </Box>
  );
};
