import type { ReactNode } from 'react';
import { Group, Text } from '@mantine/core';
import styles from './SidebarItem.module.scss';

type SidebarItemProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  collapsed?: boolean;
};

export const SidebarItem = ({ icon, label, active, collapsed }: SidebarItemProps) => {
  return (
    <Group className={`${styles.item} ${collapsed ? styles.collapsed : ''} ${active ? styles.active : ''}`} gap={10} wrap="nowrap">
      <span className={styles.icon}>{icon}</span>
      {!collapsed ? <Text className={styles.label}>{label}</Text> : null}
    </Group>
  );
};
