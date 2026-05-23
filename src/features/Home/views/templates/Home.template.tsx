import { Box } from '@mantine/core';
import { MainPanel } from '../organisms/MainPanel.organism';
import { Sidebar } from '../organisms/Sidebar.organism';
import type { ChangeEvent, ClipboardEvent, KeyboardEvent, RefObject, UIEvent } from 'react';
import type { ChatItemView, MainPanelViewProps, NavItemView, ProjectGroupView } from '../interfaces/home.interface';
import styles from './Home.module.scss';

type HomeTemplateProps = {
  navItems: NavItemView[];
  projectGroups: ProjectGroupView[];
  chats: ChatItemView[];
  mainPanelKey: string;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  mainPanel: MainPanelViewProps;
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

export const HomeTemplate = ({
  navItems,
  projectGroups,
  chats,
  mainPanelKey,
  isSidebarCollapsed,
  onToggleSidebar,
  onNewChat,
  onSelectSession,
  mainPanel,
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
}: HomeTemplateProps) => {
  return (
    <Box className={styles.layout}>
      <Sidebar
        navItems={navItems}
        projectGroups={projectGroups}
        chats={chats}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={onToggleSidebar}
        onNewChat={onNewChat}
        onSelectSession={onSelectSession}
      />
      <MainPanel
        key={mainPanelKey}
        view={mainPanel}
        bodyRef={bodyRef}
        historyPaneRef={historyPaneRef}
        composerRef={composerRef}
        addMenuRef={addMenuRef}
        fileInputRef={fileInputRef}
        modelPickerRef={modelPickerRef}
        terminalOutputRef={terminalOutputRef}
        onHistoryScroll={onHistoryScroll}
        onPreviewImage={onPreviewImage}
        onClosePreviewImage={onClosePreviewImage}
        onToggleTerminal={onToggleTerminal}
        onDraftTerminalCommandChange={onDraftTerminalCommandChange}
        onRunTerminalCommand={onRunTerminalCommand}
        onDraftPromptChange={onDraftPromptChange}
        onComposerPaste={onComposerPaste}
        onComposerKeyDown={onComposerKeyDown}
        onFileInputChange={onFileInputChange}
        onToggleAddMenu={onToggleAddMenu}
        onOpenFilePicker={onOpenFilePicker}
        onToggleModelMenu={onToggleModelMenu}
        onRemoveAttachment={onRemoveAttachment}
        onSubmitPrompt={onSubmitPrompt}
        onStopPrompt={onStopPrompt}
      />
    </Box>
  );
};
