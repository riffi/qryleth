import React from 'react'
import { Paper, TextInput, Button, Group } from '@mantine/core'
import { IconSend } from '@tabler/icons-react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  placeholder = 'Введите сообщение...',
  disabled = false,
  loading = false
}) => {
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSend()
    }
  }

  return (
    <Paper p="md" withBorder style={{ flexShrink: 0 }}>
      <Group gap="sm">
        <TextInput
          flex={1}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled || loading}
        />
        <Button
          onClick={onSend}
          disabled={!value.trim() || disabled || loading}
          loading={loading}
          leftSection={<IconSend size={16} />}
        >
          Отправить
        </Button>
      </Group>
    </Paper>
  )
}