import React from 'react'
import { Paper, Text, Group, ActionIcon } from '@mantine/core'
import { IconUser, IconRobot } from '@tabler/icons-react'
import type { ChatMessage } from '../../types'

interface ChatMessageItemProps {
  message: ChatMessage
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const getMessageIcon = (role: string) => {
    switch (role) {
      case 'user':
        return <IconUser size={16} />
      case 'assistant':
        return <IconRobot size={16} />
      default:
        return null
    }
  }

  const getMessageColor = (role: string) => {
    switch (role) {
      case 'user':
        return 'blue'
      case 'assistant':
        return 'green'
      default:
        return 'gray'
    }
  }

  const getBackgroundColor = (role: string) => {
    switch (role) {
      case 'user':
        return '#303030'
      case 'assistant':
        return '#34343e'
      default:
        return '#2a2a2a'
    }
  }

  return (
    <Paper
      p="sm"
      withBorder
      style={{
        backgroundColor: getBackgroundColor(message.role),
        marginLeft: message.role === 'user' ? '20%' : '0',
        marginRight: message.role === 'user' ? '0' : '20%'
      }}
    >
      <Group gap="xs" mb="xs">
        <ActionIcon
          size="sm"
          variant="subtle"
          color={getMessageColor(message.role)}
        >
          {getMessageIcon(message.role)}
        </ActionIcon>
        <Text size="sm" fw={500} style={{ fontSize: '0.8rem' }} c={getMessageColor(message.role)}>
          {message.role === 'user' ? 'Вы' : 'Агент'}
        </Text>
        <Text size="xs" c="dimmed">
          {message.timestamp.toLocaleTimeString()}
        </Text>
      </Group>
      <Text style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
        {message.content}
      </Text>
    </Paper>
  )
}