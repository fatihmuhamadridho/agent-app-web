import { useQuery } from '@tanstack/react-query';
import { useEffect, useSyncExternalStore } from 'react';
import type { ChatHistoryResult, HomeResponseGetSidebarData } from '@features/Home/domain/home.interface';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'agent-app-web.sidebar-collapsed';

const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
};

export const useGetSidebarData = () => {
  return useQuery({
    queryKey: ['home-sidebar-data'],
    queryFn: () => fetchJson<HomeResponseGetSidebarData>('/api/home/sidebar'),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};

export const useGetChatHistory = (sessionId?: string) => {
  return useQuery({
    queryKey: ['home-chat-history', sessionId],
    queryFn: () => fetchJson<ChatHistoryResult>(`/api/home/sidebar/${sessionId ?? ''}`),
    enabled: Boolean(sessionId),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};

const getSidebarCollapsedSnapshot = () => window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
const getSidebarCollapsedServerSnapshot = () => false;

const subscribeToSidebarCollapsed = (onStoreChange: () => void) => {
  const handleStorageChange = () => onStoreChange();

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('agent-app-web-sidebar-collapsed-change', onStoreChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener('agent-app-web-sidebar-collapsed-change', onStoreChange);
  };
};

export const useSidebarCollapsedState = () =>
  useSyncExternalStore(subscribeToSidebarCollapsed, getSidebarCollapsedSnapshot, getSidebarCollapsedServerSnapshot);

export const useSidebarCollapsedPersistence = (isSidebarCollapsed: boolean) => {
  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);
};

export const useSidebarCollapsedToggle = (isSidebarCollapsed: boolean) => {
  return () => {
    const nextValue = !isSidebarCollapsed;
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(nextValue));
    window.dispatchEvent(new Event('agent-app-web-sidebar-collapsed-change'));
  };
};
