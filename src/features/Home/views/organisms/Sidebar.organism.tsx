import { Box, Stack, Text } from '@mantine/core';
import { useMemo, useSyncExternalStore, type ReactNode } from 'react';
import {
  IconCalendarEvent,
  IconArrowsMinimize,
  IconFolder,
  IconFolderPlus,
  IconMessageCircle,
  IconMessageCirclePlus,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarRightExpand,
  IconDots,
  IconSearch,
  IconSettings,
  IconSparkles,
} from '@tabler/icons-react';
import { SidebarItem } from '../atoms/SidebarItem.atom';
import { ChatList } from '../molecules/ChatList.molecule';
import type { ChatItemView, NavItemView, ProjectGroupView } from '../interfaces/home.interface';
import styles from './Sidebar.module.scss';

const PROJECT_EXPANDED_STORAGE_KEY = 'agent-app-web.sidebar-projects-expanded';

const notifyProjectExpandedChange = () => {
  window.dispatchEvent(new Event('agent-app-web-sidebar-projects-expanded-change'));
};

const subscribeToProjectExpandedChange = (onStoreChange: () => void) => {
  const handleStorageChange = () => onStoreChange();

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('agent-app-web-sidebar-projects-expanded-change', onStoreChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener('agent-app-web-sidebar-projects-expanded-change', onStoreChange);
  };
};

const getProjectExpandedSnapshot = () => window.localStorage.getItem(PROJECT_EXPANDED_STORAGE_KEY) ?? '{}';

const getProjectExpandedServerSnapshot = () => '{}';

type SidebarProps = {
  navItems: NavItemView[];
  projectGroups: ProjectGroupView[];
  chats: ChatItemView[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNewChat: () => void;
  onSelectSession?: (sessionId: string) => void;
};

const navIconMap: Record<string, ReactNode> = {
  'New chat': <IconMessageCirclePlus size={16} />,
  Search: <IconSearch size={16} />,
  Plugins: <IconSparkles size={16} />,
  Automations: <IconCalendarEvent size={16} />,
};

export const Sidebar = ({ navItems, projectGroups, chats, isCollapsed, onToggleCollapse, onNewChat, onSelectSession }: SidebarProps) => {
  const expandedProjectsStorage = useSyncExternalStore(
    subscribeToProjectExpandedChange,
    getProjectExpandedSnapshot,
    getProjectExpandedServerSnapshot
  );
  const expandedProjects = useMemo(() => {
    try {
      return JSON.parse(expandedProjectsStorage) as Record<string, boolean>;
    } catch {
      return {};
    }
  }, [expandedProjectsStorage]);
  const openProjectCount = useMemo(
    () => Object.values(expandedProjects).filter(Boolean).length,
    [expandedProjects]
  );

  const toggleProject = (projectId: string) => {
    const nextValue = {
      ...expandedProjects,
      [projectId]: !expandedProjects[projectId],
    };

    window.localStorage.setItem(PROJECT_EXPANDED_STORAGE_KEY, JSON.stringify(nextValue));
    notifyProjectExpandedChange();
  };

  const collapseAllProjects = () => {
    const nextValue = Object.fromEntries(Object.keys(expandedProjects).map((projectId) => [projectId, false]));
    window.localStorage.setItem(PROJECT_EXPANDED_STORAGE_KEY, JSON.stringify(nextValue));
    notifyProjectExpandedChange();
  };

  return (
    <Box component="aside" className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <button type="button" className={styles.collapseButton} onClick={onToggleCollapse} aria-label={isCollapsed ? 'Open sidebar' : 'Close sidebar'}>
        {isCollapsed ? <IconLayoutSidebarRightExpand size={18} /> : <IconLayoutSidebarLeftCollapse size={18} />}
      </button>

      <Stack className={styles.nav} gap={2}>
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={styles.navButton}
            onClick={item.label === 'New chat' ? onNewChat : undefined}
            aria-label={item.label}
          >
            <SidebarItem
              icon={navIconMap[item.label] ?? <IconMessageCircle size={16} />}
              label={item.label}
              active={item.active}
              collapsed={isCollapsed}
            />
          </button>
        ))}
      </Stack>

      <Box className={styles.scrollArea}>
        {!isCollapsed ? (
          <>
            <Stack className={styles.section} gap={8}>
              <Box className={styles.projectsHeader}>
                <Text className={styles.sectionLabel}>Projects</Text>
                <Box className={styles.projectsHeaderActions}>
                  {openProjectCount >= 2 ? (
                    <button type="button" className={styles.projectsHeaderButton} aria-label="Collapse all projects" onClick={collapseAllProjects}>
                      <IconArrowsMinimize size={14} />
                    </button>
                  ) : null}
                  <button type="button" className={styles.projectsHeaderButton} aria-label="Projects menu">
                    <IconDots size={14} />
                  </button>
                  <button type="button" className={styles.projectsHeaderButton} aria-label="Add new project">
                    <IconFolderPlus size={14} />
                  </button>
                </Box>
              </Box>
              <Stack gap={10}>
                {projectGroups.map((group) => (
                  <Stack key={group.id} gap={6} className={styles.projectGroup}>
                    <Box component="div" className={styles.projectHeader} onClick={() => toggleProject(group.id)}>
                      <Box className={styles.projectHeaderMain}>
                        <IconFolder size={15} />
                        <Text className={styles.projectLabel}>{group.label}</Text>
                      </Box>
                      <Box className={styles.projectHeaderActions}>
                        <button
                          type="button"
                          className={styles.projectHeaderButton}
                          aria-label="Project menu"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <IconDots size={14} />
                        </button>
                        <button
                          type="button"
                          className={styles.projectHeaderButton}
                          aria-label="New chat in project"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <IconMessageCirclePlus size={14} />
                        </button>
                      </Box>
                    </Box>
                    {expandedProjects[group.id] ? (
                      <Stack gap={2} className={styles.projectSessions}>
                        {group.sessions.slice(0, 5).map((session) => (
                          <button
                            key={session.id}
                            type="button"
                            className={`${styles.sessionItem} ${session.active ? styles.sessionActive : ''}`}
                            onClick={() => onSelectSession?.(session.id)}
                          >
                            <Text className={styles.sessionLabel}>{session.label}</Text>
                            {session.time ? <Text className={styles.sessionTime}>{session.time}</Text> : null}
                          </button>
                        ))}
                        {group.sessions.length > 5 ? (
                          <button type="button" className={styles.toggleButton} onClick={() => toggleProject(group.id)}>
                            Show more
                          </button>
                        ) : null}
                      </Stack>
                    ) : null}
                  </Stack>
                ))}
              </Stack>
            </Stack>

            <Stack className={styles.section} gap={8}>
              <Text className={styles.sectionLabel}>Chats</Text>
              <ChatList items={chats} onSelect={onSelectSession} />
            </Stack>
          </>
        ) : null}
      </Box>

      <Box className={styles.footer}>
        <SidebarItem icon={<IconSettings size={16} />} label="Settings" collapsed={isCollapsed} />
      </Box>
    </Box>
  );
};
