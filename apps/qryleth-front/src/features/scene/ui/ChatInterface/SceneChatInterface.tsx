import { useRef, useState } from 'react'
import { Stack, Paper, Text, Group, Badge, Select, Box, Tabs, ActionIcon } from '@mantine/core'
import { IconArrowsDiagonalMinimize2 } from '@tabler/icons-react'
import { ChatContainer, ChatInput, useChatScroll } from '@/shared/entities/chat'
import { getProviderModels } from '@/shared/lib/openAISettings'
import type {GfxObjectWithTransform} from "@/entities"
import { useSceneChat } from './hooks/useSceneChat'
import { SceneDebugPanel } from './components/SceneDebugPanel'
import { sceneToolUtils } from './components/SceneToolCallbacks'

interface Props {
  onCollapse?: () => void
}

export const SceneChatInterface: React.FC<Props> = ({ onCollapse }) => {
  const [inputValue, setInputValue] = useState('')
  
  // Используем scene-специфичный хук чата
  const { 
    messages, 
    isLoading, 
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
      {/* Header с контролами (внутри панели, без дополнительного Paper) */}
      <Box p="sm" style={{
        borderBottom: '1px solid var(--mantine-color-dark-5)',
        background: 'var(--mantine-color-dark-7)'
      }}>
        <Group justify="space-between" align="center">
          <Group gap="xs" align="center" wrap="nowrap" style={{ width: '100%' }}>
            <Group flex={1} style={{ flexGrow: 1 }}>
              <Text size="lg" fw={500}>
                Чат
              </Text>
              {connection && (
                <Badge variant="light" color="gray">
                  {connection.name}
                </Badge>
              )}
            </Group>
            {onCollapse && (
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={onCollapse}
                aria-label="Свернуть чат"
              >
                <IconArrowsDiagonalMinimize2 size={16} />
              </ActionIcon>
            )}
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
      </Box>

      {/* Табы для переключения между чатом и отладкой */}
      <Tabs
        defaultValue="chat"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '0' }}
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
            emptyStateMessage="Попросите агента добавить объект в сцену..."
            scrollAreaRef={scrollAreaRef}
            style={{ flex: 1, minHeight: 0 }}
          />
          
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSendMessage}
            placeholder="Попросите добавить объект..."
            disabled={isLoading}
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