import React, { useState, useEffect } from 'react'
import { Stack, Paper, Text, Group, Badge, ActionIcon } from '@mantine/core'
import { IconTrash, IconArrowsDiagonalMinimize2 } from '@tabler/icons-react'
import { ChatContainer, ChatInput, useChatScroll } from '@/shared/entities/chat'
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
  /**
   * Скрыть заголовок внутри панели чата. Полезно, когда заголовок рендерится контейнером панели (Layout).
   */
  hideHeader?: boolean
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
  onObjectModified,
  hideHeader = false
}) => {
  const [inputValue, setInputValue] = useState('')

  const {
    messages,
    isLoading,
    isStoppable,
    sendMessage,
    stopExecution,
    clearMessages,
    objectInfo
  } = useObjectChat({
    mode,
    onPrimitiveAdded,
    onMaterialCreated,
    onObjectModified
  })

  const { scrollAreaRef } = useChatScroll(messages)


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
      {!hideHeader && (
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
      )}

      <ChatContainer
        messages={messages}
        isLoading={isLoading}
        emptyStateMessage="Начните диалог с AI помощником..."
        scrollAreaRef={scrollAreaRef}
        style={{ flex: 1, minHeight: 0 }}
        renderMessage={(message) => (
          <div key={message.id}>
            <div>{message.content}</div>
            {message.toolCalls && message.toolCalls.length > 0 && (
              <ObjectToolCallbacks toolCalls={message.toolCalls} />
            )}
          </div>
        )}
      />

      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        onStop={stopExecution}
        placeholder={
          objectInfo.isEmpty
            ? "Например: 'Создай базовую структуру дома'"
            : 'Что хочешь изменить в объекте?'
        }
        disabled={isLoading}
        loading={isLoading}
        stoppable={isStoppable}
      />
    </Stack>
  )
}
