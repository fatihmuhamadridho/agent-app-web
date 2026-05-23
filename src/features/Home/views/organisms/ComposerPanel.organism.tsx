import { Box, Button, Group, Text, Textarea } from '@mantine/core';
import { IconChevronDown, IconFilePlus, IconFileText, IconPaperclip, IconSend2, IconSparkles, IconSquareCheck, IconSquareX, IconX } from '@tabler/icons-react';
import Image from 'next/image';
import type { ChangeEvent, ClipboardEvent, KeyboardEvent, RefObject } from 'react';
import type { ComposerView } from '../interfaces/home.interface';
import styles from './MainPanel.module.scss';

type ComposerPanelProps = {
  composer: ComposerView;
  fileInputRef: RefObject<HTMLInputElement | null>;
  composerRef: RefObject<HTMLDivElement | null>;
  addMenuRef: RefObject<HTMLDivElement | null>;
  modelPickerRef: RefObject<HTMLDivElement | null>;
  variant?: 'docked' | 'landing';
  onDraftPromptChange: (value: string) => void;
  onComposerPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  onComposerKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleAddMenu: () => void;
  onOpenFilePicker: () => void;
  onToggleModelMenu: () => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onPreviewImage: (image: string) => void;
  onSubmitPrompt: () => void;
  onStopPrompt: () => void;
};

export const ComposerPanel = ({
  composer,
  fileInputRef,
  composerRef,
  addMenuRef,
  modelPickerRef,
  variant = 'docked',
  onDraftPromptChange,
  onComposerPaste,
  onComposerKeyDown,
  onFileInputChange,
  onToggleAddMenu,
  onOpenFilePicker,
  onToggleModelMenu,
  onRemoveAttachment,
  onPreviewImage,
  onSubmitPrompt,
  onStopPrompt,
}: ComposerPanelProps) => {
  const containerClassName = variant === 'landing' ? styles.composerLanding : styles.composer;

  return (
    <Box className={containerClassName} ref={composerRef}>
      {composer.attachments.length ? (
        <Box className={styles.composerAttachments}>
          {composer.attachments.map((attachment) =>
            attachment.isImage && attachment.previewUrl ? (
              <Box key={attachment.id} className={styles.composerImageAttachment}>
                <button
                  type="button"
                  className={styles.composerAttachmentImageFrame}
                  aria-label={`Preview ${attachment.fileName}`}
                  onClick={() => onPreviewImage(attachment.previewUrl ?? attachment.dataUrl ?? '')}
                >
                  <Image className={styles.composerAttachmentImage} src={attachment.previewUrl} alt={attachment.fileName} fill unoptimized />
                </button>
                <Text size="xs" className={styles.composerAttachmentLabel}>
                  {attachment.fileName}
                </Text>
                <button
                  type="button"
                  className={styles.composerImageAttachmentRemove}
                  aria-label={`Remove ${attachment.fileName}`}
                  onClick={() => onRemoveAttachment(attachment.id)}
                >
                  <IconX size={12} />
                </button>
              </Box>
            ) : (
              <Box key={attachment.id} className={styles.composerAttachment}>
                <Box className={styles.composerAttachmentFileIcon}>
                  <IconFileText size={18} />
                </Box>
                <Text size="sm" className={styles.composerAttachmentLabel}>
                  {attachment.fileName}
                </Text>
                <button
                  type="button"
                  className={styles.composerAttachmentRemove}
                  aria-label={`Remove ${attachment.fileName}`}
                  onClick={() => onRemoveAttachment(attachment.id)}
                >
                  <IconX size={12} />
                </button>
              </Box>
            )
          )}
        </Box>
      ) : null}

      <input ref={fileInputRef} type="file" multiple className={styles.hiddenFileInput} onChange={onFileInputChange} />
      <Textarea
        value={composer.draftPrompt}
        onChange={(event) => onDraftPromptChange(event.currentTarget.value)}
        onPaste={onComposerPaste}
        onKeyDown={onComposerKeyDown}
        placeholder="Ask anything. @ to use plugins or mention files"
        className={styles.prompt}
        autosize
        minRows={2}
        maxRows={8}
        variant="unstyled"
      />

      <Box className={styles.composerBar}>
        <Group gap={6} align="center">
          <Box className={styles.addMenu} ref={addMenuRef}>
            <button type="button" className={styles.addButton} aria-label="Add attachment" onClick={onToggleAddMenu}>
              <IconFilePlus size={16} />
            </button>
            {composer.isAddMenuOpen ? (
              <Box className={styles.addDropdown}>
                <button type="button" className={styles.addMenuItem} onClick={onOpenFilePicker}>
                  <IconPaperclip size={16} />
                  <Text className={styles.addMenuLabel}>Upload file</Text>
                </button>
              </Box>
            ) : null}
          </Box>

          <Button type="button" variant="subtle" className={styles.toolButton} leftSection={<IconSparkles size={14} />}>
            Full access
          </Button>
        </Group>

        <Group gap={8} align="center">
          <Box className={styles.modelPicker} ref={modelPickerRef}>
            <button type="button" className={styles.modelButton} aria-label="Open model picker" onClick={onToggleModelMenu}>
              <Group gap={4} align="center" wrap="nowrap">
                <Text className={styles.model}>{composer.selectedModel.label}</Text>
                <Text className={styles.modelMuted}>{composer.selectedModel.detail}</Text>
                <IconChevronDown size={14} className={styles.chevron} />
              </Group>
            </button>
          </Box>

          <button type="button" className={styles.addButton} aria-label="Voice input">
            <IconSquareCheck size={16} className={styles.iconMuted} />
          </button>

          <Button
            type="button"
            className={styles.sendButton}
            aria-label={composer.isSubmitting ? 'Stop generation' : 'Send message'}
            onClick={composer.isSubmitting ? onStopPrompt : onSubmitPrompt}
          >
            {composer.isSubmitting ? <IconSquareX size={16} /> : <IconSend2 size={16} />}
          </Button>
        </Group>
      </Box>
    </Box>
  );
};
