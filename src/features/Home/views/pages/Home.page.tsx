import Head from 'next/head';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  useGetSidebarData,
  useSidebarCollapsedPersistence,
  useSidebarCollapsedState,
  useSidebarCollapsedToggle,
} from '@features/Home/infrastructure/home.hook';
import { clearAllPendingPromptHandoffs } from '@features/Home/infrastructure/home.pending-prompt';
import { HomeTemplate } from '../templates/Home.template';
import type { ChatItemView, ModelVariantView, NavItemView, ProjectGroupView } from '../interfaces/home.interface';

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

const HomePage = () => {
  const router = useRouter();
  const { data } = useGetSidebarData();
  const [selectedModelId, setSelectedModelId] = useState(modelVariants[0].id);
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

  const handleSelectSession = (sessionId: string) => {
    void router.push(`/c/${encodeURIComponent(sessionId)}`);
  };

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
        active: chat.active,
      })) ?? [],
    [data?.chats]
  );

  const chatsWithActive = useMemo(
    () => chats.map((chat) => ({ ...chat, active: chat.id === selectedSessionId })),
    [chats, selectedSessionId]
  );

  const selectedModel = modelVariants.find((model) => model.id === selectedModelId) ?? modelVariants[0];
  const mainPanelKey = `${selectedSessionId ?? 'landing'}-${newChatResetCounter}`;

  return (
    <>
      <Head>
        <title>Home | agent-app-web</title>
        <meta name="description" content="Agent-style home dashboard shell" />
      </Head>
      <HomeTemplate
        navItems={navItems}
        projectGroups={projectGroups}
        chats={chatsWithActive}
        selectedSessionId={selectedSessionId}
        mainPanelKey={mainPanelKey}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        modelVariants={modelVariants}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModelId}
      />
    </>
  );
};

export default HomePage;
