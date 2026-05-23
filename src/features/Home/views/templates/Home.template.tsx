import { Box } from '@mantine/core';
import { MainPanel } from '../organisms/MainPanel.organism';
import { Sidebar } from '../organisms/Sidebar.organism';
import type { ChatItemView, ModelVariantView, NavItemView, ProjectGroupView } from '../interfaces/home.interface';
import styles from './Home.module.scss';

type HomeTemplateProps = {
  navItems: NavItemView[];
  projectGroups: ProjectGroupView[];
  chats: ChatItemView[];
  selectedSessionId?: string;
  mainPanelKey: string;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  modelVariants: ModelVariantView[];
  selectedModel: ModelVariantView;
  onSelectModel: (modelId: string) => void;
};

export const HomeTemplate = ({
  navItems,
  projectGroups,
  chats,
  selectedSessionId,
  mainPanelKey,
  isSidebarCollapsed,
  onToggleSidebar,
  onNewChat,
  onSelectSession,
  modelVariants,
  selectedModel,
  onSelectModel,
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
        selectedSessionId={selectedSessionId}
        modelVariants={modelVariants}
        selectedModel={selectedModel}
        onSelectModel={onSelectModel}
        onSelectSession={onSelectSession}
      />
    </Box>
  );
};
