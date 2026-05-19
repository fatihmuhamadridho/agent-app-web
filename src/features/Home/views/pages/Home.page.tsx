import Head from 'next/head';
import { useMemo, useState } from 'react';
import {
  useGetSidebarData,
  useSidebarCollapsedPersistence,
  useSidebarCollapsedState,
  useSidebarCollapsedToggle,
} from '@features/Home/infrastructure/home.hook';
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

const HomePage = () => {
  const { data } = useGetSidebarData();
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>();
  const [selectedModelId, setSelectedModelId] = useState(modelVariants[0].id);
  const isSidebarCollapsed = useSidebarCollapsedState();
  useSidebarCollapsedPersistence(isSidebarCollapsed);
  const handleToggleSidebar = useSidebarCollapsedToggle(isSidebarCollapsed);

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
        <meta name="description" content="Agent-style home dashboard shell" />
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
