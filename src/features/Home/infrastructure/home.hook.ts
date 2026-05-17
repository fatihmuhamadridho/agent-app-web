import { useQuery } from '@tanstack/react-query';
import { HomeController } from '@features/Home/domain/home.controller';

const homeController = new HomeController();

export const useGetSidebarData = () => {
  return useQuery({
    queryKey: ['home-sidebar-data'],
    queryFn: () => homeController.getSidebarData(),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};

export const useGetChatHistory = (sessionId?: string) => {
  return useQuery({
    queryKey: ['home-chat-history', sessionId],
    queryFn: () => homeController.getChatHistory(sessionId ?? ''),
    enabled: Boolean(sessionId),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};
