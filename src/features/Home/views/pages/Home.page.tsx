import Head from 'next/head';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useGetSidebarData } from '@features/Home/infrastructure/home.hook';
import { HomeTemplate } from '../templates/Home.template';
import type { ChatItemView, ModelVariantView, NavItemView, ProjectGroupView } from '../interfaces/home.interface';

const navItems: NavItemView[] = [
  { label: 'New chat', icon: 'plus', active: true },
  { label: 'Search', icon: 'search' },
  { label: 'Plugins', icon: 'sparkles' },
  { label: 'Automations', icon: 'clock' },
];

const modelVariants: ModelVariantView[] = [
  { id: 'gpt-5.4-mini', label: '5.4-Mini', detail: 'Low' },
  { id: 'gpt-5.4', label: '5.4', detail: 'Balanced' },
  { id: 'gpt-5.2', label: '5.2', detail: 'High' },
];

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'agent-app-web.sidebar-collapsed';

const notifySidebarCollapsedChange = () => {
  window.dispatchEvent(new Event('agent-app-web-sidebar-collapsed-change'));
};

const subscribeToSidebarCollapsed = (onStoreChange: () => void) => {
  const handleStorageChange = () => onStoreChange();

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('agent-app-web-sidebar-collapsed-change', onStoreChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener('agent-app-web-sidebar-collapsed-change', onStoreChange);
  };
};

const getSidebarCollapsedSnapshot = () => {
  const storedValue = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
  return storedValue === 'true';
};

const getSidebarCollapsedServerSnapshot = () => false;

const HomePage = () => {
  const { data } = useGetSidebarData();
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>();
  const [selectedModelId, setSelectedModelId] = useState(modelVariants[0].id);
  const isSidebarCollapsed = useSyncExternalStore(
    subscribeToSidebarCollapsed,
    getSidebarCollapsedSnapshot,
    getSidebarCollapsedServerSnapshot
  );

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const handleToggleSidebar = () => {
    const nextValue = !isSidebarCollapsed;
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(nextValue));
    notifySidebarCollapsedChange();
  };

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

  return (
    <>
      <Head>
        <title>Home | agent-app-web</title>
        <meta name="description" content="Codex-style home dashboard shell" />
      </Head>
      <HomeTemplate
        navItems={navItems}
        projectGroups={projectGroups}
        chats={chatsWithActive}
        selectedSessionId={selectedSessionId}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
        onSelectSession={setSelectedSessionId}
        modelVariants={modelVariants}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModelId}
      />
    </>
  );
};

export default HomePage;
