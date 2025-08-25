import React from 'react'
import { Paper, TextInput, Button, Group } from '@mantine/core'
import { IconSend, IconPlayerStop } from '@tabler/icons-react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onStop?: () => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  stoppable?: boolean
}

/**
 * Компонент ввода сообщений для чата с поддержкой остановки выполнения.
 * Показывает кнопку "Отправить" в обычном состоянии и кнопку "Стоп" при выполнении запроса.
 */
export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onStop,
  placeholder = 'Введите сообщение...',
  disabled = false,
  loading = false,
  stoppable = false
}) => {
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (stoppable && onStop) {
        onStop()
      } else if (!loading && !disabled && value.trim()) {
        onSend()
      }
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
        
        {stoppable && onStop ? (
          <Button
            onClick={onStop}
            color="red"
            leftSection={<IconPlayerStop size={16} />}
          >
            Стоп
          </Button>
        ) : (
          <Button
            onClick={onSend}
            disabled={!value.trim() || disabled || loading}
            loading={loading}
            leftSection={<IconSend size={16} />}
          >
            Отправить
          </Button>
        )}
      </Group>
    </Paper>
  )
}