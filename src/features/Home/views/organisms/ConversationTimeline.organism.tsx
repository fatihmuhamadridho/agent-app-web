import { Box, Stack, Text } from '@mantine/core';
import type { ConversationSegmentView, ChatMessageView } from '../interfaces/home.interface';
import { renderAssistantContent, renderConversationMessages, renderMessageImages } from './MainPanelContent.shared';
import styles from './MainPanel.module.scss';

type ConversationTimelineProps = {
  leadingAssistantMessages: ChatMessageView[];
  conversationSegments: ConversationSegmentView[];
  isPromptSubmitting: boolean;
  onPreviewImage: (image: string) => void;
};

export const ConversationTimeline = ({
  leadingAssistantMessages,
  conversationSegments,
  isPromptSubmitting,
  onPreviewImage,
}: ConversationTimelineProps) => {
  return (
    <Box className={styles.content}>
      <Stack className={styles.history} gap={12}>
        {leadingAssistantMessages.length ? (
          <Stack className={`${styles.messageStack} ${styles.assistantStack}`} gap={6}>
            {renderMessageImages(leadingAssistantMessages[0].id, leadingAssistantMessages[0].images, onPreviewImage)}
            <Box className={`${styles.inlineMessage} ${styles.assistant}`}>
              {leadingAssistantMessages.map((message) => (
                <Box key={message.id}>{renderAssistantContent(message.content)}</Box>
              ))}
            </Box>
          </Stack>
        ) : null}

        {conversationSegments.map((segment) => (
          <Stack key={segment.id} gap={10}>
            {renderConversationMessages(segment, onPreviewImage)}
          </Stack>
        ))}

        {isPromptSubmitting ? (
          <Box className={styles.thinkingHistory}>
            <Text className={styles.thinkingHistoryLabel}>Thinking</Text>
            <Box className={styles.thinkingHistoryLine} />
            <Text className={styles.thinkingStatus}>Working...</Text>
          </Box>
        ) : null}
      </Stack>
    </Box>
  );
};
