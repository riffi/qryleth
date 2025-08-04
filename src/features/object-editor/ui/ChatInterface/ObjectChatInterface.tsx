import React, { useState, useEffect } from 'react'
import { Stack, Paper, Text, Group, Badge, ActionIcon, ScrollArea } from '@mantine/core'
import { IconTrash, IconBulb, IconArrowsDiagonalMinimize2 } from '@tabler/icons-react'
import { ChatMessageItem, ChatInput, useChatScroll } from '@/shared/entities/chat'
import { useObjectChat } from './hooks'
import { ObjectToolCallbacks } from './components/ObjectToolCallbacks'
import type { GfxPrimitive } from '@/entities/primitive'
import type { CreateGfxMaterial } from '@/entities/material'

interface ObjectChatInterfaceProps {
  isVisible: boolean
  onVisibilityChange?: (visible: boolean) => void
  mode?: 'page' | 'modal'
  className?: string
  onPrimitiveAdded?: (primitive: GfxPrimitive) => void
  onMaterialCreated?: (material: CreateGfxMaterial) => void
  onObjectModified?: (modifications: Record<string, unknown>) => void
}

/**
 * Интерфейс чата для ObjectEditor с версткой, аналогичной SceneEditor.
 */
export const ObjectChatInterface: React.FC<ObjectChatInterfaceProps> = ({
  isVisible,
  onVisibilityChange,
  mode = 'page',
  className = '',
  onPrimitiveAdded,
  onMaterialCreated,
  onObjectModified
}) => {
  const [inputValue, setInputValue] = useState('')

  const {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    objectInfo,
    contextualHints,
    showContextualHints,
    addSystemMessage
  } = useObjectChat({
    mode,
    onPrimitiveAdded,
    onMaterialCreated,
    onObjectModified
  })

  const { scrollAreaRef } = useChatScroll(messages)

  useEffect(() => {
    if (isVisible && messages.length === 0) {
      const welcomeMessage = objectInfo.isEmpty
        ? `👋 Привет! Я помогу тебе создать 3D объект.\n\nНачнем с основ - я могу:\n• Добавить примитивы (box, sphere, cylinder и др.)\n• Создать материалы с настройками цвета и текстур\n• Анализировать и оптимизировать структуру\n\nЧто бы ты хотел создать?`
        : `👋 Привет! Вижу, у тебя уже есть объект с ${objectInfo.primitivesCount} примитив(ами) и ${objectInfo.materialsCount} материал(ами).\n\nЧем могу помочь?`

      addSystemMessage(welcomeMessage)

      if (contextualHints.length > 0) {
        setTimeout(() => showContextualHints(), 1000)
      }
    }
  }, [isVisible, messages.length, objectInfo, addSystemMessage, showContextualHints, contextualHints.length])

  /**
   * Отправляет введенное пользователем сообщение и очищает поле ввода.
   */
  const handleSend = async () => {
    if (!inputValue.trim()) return
    await sendMessage(inputValue.trim())
    setInputValue('')
  }

  if (!isVisible) return null

  return (
    <Stack gap={0} className={className} style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <Paper p="md" withBorder>
        <Group justify="space-between" align="center">
          <Group gap="xs" align="center">
            <Text size="lg" fw={500}>Чат</Text>
            {!objectInfo.isEmpty && (
              <Badge variant="light" color="gray">
                {objectInfo.primitivesCount}P • {objectInfo.materialsCount}M
              </Badge>
            )}
          </Group>
          <Group gap="xs">
            {contextualHints.length > 0 && (
              <ActionIcon
                variant="light"
                size="sm"
                onClick={showContextualHints}
                aria-label="Показать подсказки"
              >
                <IconBulb size={16} />
              </ActionIcon>
            )}
            <ActionIcon
              variant="light"
              size="sm"
              onClick={clearMessages}
              aria-label="Очистить чат"
            >
              <IconTrash size={16} />
            </ActionIcon>
            {onVisibilityChange && (
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => onVisibilityChange(false)}
                aria-label="Скрыть чат"
              >
                <IconArrowsDiagonalMinimize2 size={16} />
              </ActionIcon>
            )}
          </Group>
        </Group>
      </Paper>

      <ScrollArea p="sm" ref={scrollAreaRef} style={{ flex: 1, minHeight: 0 }}>
        <Stack gap="sm">
          {messages.length === 0 && (
            <Paper p="sm" withBorder style={{ backgroundColor: '#4e4e4e' }}>
              <Text c="white" ta="center" style={{ fontSize: '0.8rem' }}>
                Начните диалог с AI помощником...
              </Text>
            </Paper>
          )}

          {messages.map(message => (
            <div key={message.id}>
              <ChatMessageItem message={message} />
              {message.toolCalls && message.toolCalls.length > 0 && (
                <ObjectToolCallbacks toolCalls={message.toolCalls} />
              )}
            </div>
          ))}

          {isLoading && (
            <Paper p="sm" withBorder style={{ backgroundColor: '#31484a' }}>
              <Group gap="xs">
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

      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        placeholder={
          objectInfo.isEmpty
            ? "Например: 'Создай базовую структуру дома'"
            : 'Что хочешь изменить в объекте?'
        }
        disabled={isLoading}
        loading={isLoading}
      />
    </Stack>
  )
}
