import React from 'react'
import { Stack, ScrollArea, Paper, Text, ActionIcon, Group } from '@mantine/core'
import { IconRobot } from '@tabler/icons-react'
import { ChatMessageItem } from '../ChatMessageItem'
import type { ChatMessage } from '../../types'

interface ChatContainerProps {
  messages: ChatMessage[]
  isLoading?: boolean
  emptyStateMessage?: string
  scrollAreaRef?: React.RefObject<HTMLDivElement>
  style?: React.CSSProperties
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  isLoading = false,
  emptyStateMessage = 'Начните диалог...',
  scrollAreaRef,
  style
}) => {
  return (
    <ScrollArea
      p="sm"
      ref={scrollAreaRef}
      style={{ flex: 1, minHeight: 0, ...style }}
    >
      <Stack gap="sm">
        {messages.length === 0 && (
          <Paper p="sm" withBorder style={{ backgroundColor: '#4e4e4e' }}>
            <Text c="white" ta="center" style={{ fontSize: '0.8rem' }}>
              {emptyStateMessage}
            </Text>
          </Paper>
        )}

        {messages.map((message) => (
          <ChatMessageItem key={message.id} message={message} />
        ))}

        {isLoading && (
          <Paper p="sm" withBorder style={{ backgroundColor: '#31484a' }}>
            <Group gap="xs">
              <ActionIcon size="sm" variant="subtle" color="green">
                <IconRobot size={16} />
              </ActionIcon>
              <Text size="sm" fw={500} c="green">
                Агент
              </Text>
            </Group>
            <Text c="dimmed" fs="italic" style={{ fontSize: '0.8rem' }}>
              Думаю...
            </Text>
          </Paper>
        )}
      </Stack>
    </ScrollArea>
  )
}