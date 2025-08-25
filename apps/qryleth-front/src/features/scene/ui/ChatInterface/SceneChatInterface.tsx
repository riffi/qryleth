import { useState } from 'react'
import { Stack, Paper, Text, Group, Badge, Select, Box, Tabs } from '@mantine/core'
import { ChatContainer, ChatInput, useChatScroll } from '@/shared/entities/chat'
import { getProviderModels } from '@/shared/lib/openAISettings'
import type {GfxObjectWithTransform} from "@/entities"
import { useSceneChat } from './hooks/useSceneChat'
import { SceneDebugPanel } from './components/SceneDebugPanel'
import { sceneToolUtils } from './components/SceneToolCallbacks'

/**
 * SceneChatInterface — панель чата сцены без собственных кнопок сворачивания/закрытия.
 *
 * В заголовке панели SceneEditor теперь рендерится иконка закрытия (как у скриптинга),
 * поэтому из самого компонента удалены элементы управления сворачиванием.
 */
export const SceneChatInterface: React.FC = () => {
  const [inputValue, setInputValue] = useState('')

  // Используем scene-специфичный хук чата
  const {
    messages,
    isLoading,
    isInitialized,
    sendMessage,
    connection,
    updateModel,
    debugChatService
  } = useSceneChat({
    onObjectAdded: (object: GfxObjectWithTransform, toolName: string) => {
      console.log(`Scene object added via ${toolName}:`, object)
    },
    debugMode: true
  })

  // Используем автоскролл из shared/entities/chat
  const { scrollAreaRef } = useChatScroll(messages)

  // Обработчик отправки сообщения
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return
    await sendMessage(inputValue)
    setInputValue('')
  }

  // Обработчик создания объекта из debug панели
  const handleObjectCreated = async (objectData: any) => {
    try {
      await sceneToolUtils.executeAddNewObject(objectData)
    } catch (error) {
      console.error('Failed to create object from debug data:', error)
    }
  }

  return (
    <Stack gap={0} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', minHeight: 0 }}>
      {/* Header с контролами */}
      <Paper p="md">
        <Group justify="space-between" align="center">
          <Group gap="xs" align="center" wrap="nowrap" style={{ width: '100%' }}>
            <Group flex={1} style={{ flexGrow: 1 }}>
              {connection && (
                <Badge variant="light" color="gray">
                  {connection.name}
                </Badge>
              )}
            </Group>
          </Group>
          <Group gap="xs" align="center" style={{ width: '100%' }}>
            {connection && (
              <Box style={{ width: '100%' }}>
                <Select
                  size="sm"
                  w="100%"
                  data={getProviderModels(connection.provider).map(m => ({ value: m, label: m }))}
                  value={connection.model}
                  onChange={val => val && updateModel(val)}
                />
              </Box>
            )}
          </Group>
        </Group>
      </Paper>

      {/* Табы для переключения между чатом и отладкой */}
      <Tabs
        defaultValue="chat"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '0', padding: '8px' }}
      >
        <Tabs.List>
          <Tabs.Tab value="chat">
            Чат
          </Tabs.Tab>
          <Tabs.Tab value="debug">
            Отладка
          </Tabs.Tab>
        </Tabs.List>

        {/* Основной чат */}
        <Tabs.Panel value="chat" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ChatContainer
            messages={messages}
            isLoading={isLoading}
            emptyStateMessage={isInitialized ? "Попросите агента добавить объект в сцену..." : "Инициализация чата..."}
            scrollAreaRef={scrollAreaRef}
            style={{ flex: 1, minHeight: 0 }}
          />

          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSendMessage}
            placeholder={isInitialized ? "Попросите добавить объект..." : "Инициализация чата..."}
            disabled={isLoading || !isInitialized}
            loading={isLoading}
          />
        </Tabs.Panel>

        {/* Debug панель */}
        <Tabs.Panel value="debug" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <SceneDebugPanel
            debugChatService={debugChatService}
            onObjectCreated={handleObjectCreated}
          />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
