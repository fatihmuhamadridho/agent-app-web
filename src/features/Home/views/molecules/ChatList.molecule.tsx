import { Box, Text } from '@mantine/core';
import type { ChatItemView } from '../interfaces/home.interface';
import styles from './ChatList.module.scss';

type ChatListProps = {
  items: ChatItemView[];
  onSelect?: (sessionId: string) => void;
};

export const ChatList = ({ items, onSelect }: ChatListProps) => {
  return (
    <Box className={styles.list}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`${styles.item} ${item.active ? styles.active : ''}`}
          onClick={() => onSelect?.(item.id)}
        >
          <Text className={styles.label}>{item.label}</Text>
          {item.time ? <Text className={styles.time}>{item.time}</Text> : null}
        </button>
      ))}
    </Box>
  );
};
