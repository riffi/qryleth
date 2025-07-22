import { useState, useEffect, useRef } from 'react'
import { Stack, Paper, TextInput, Button, Text, Group, ScrollArea, ActionIcon, Badge, Select, Box, Tabs, Textarea } from '@mantine/core'
import { IconSend, IconUser, IconRobot } from '@tabler/icons-react'
import { fetchWithTools, AVAILABLE_TOOLS } from '@/shared/lib/openAIAPI'
import type { ChatMessage, ToolCall } from '@/shared/lib/openAIAPI'
import { getActiveConnection, upsertConnection, getProviderModels } from '@/shared/lib/openAISettings'
import type { OpenAISettingsConnection } from '@/shared/lib/openAISettings'
import type {GFXObjectWithTransform} from "@/entities";


interface Props {
  onObjectAdded: (object: GFXObjectWithTransform) => void
}

export const ChatInterface: React.FC<Props> = ({ onObjectAdded }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [connection, setConnection] = useState<OpenAISettingsConnection | null>(null)
  const [activeTab, setActiveTab] = useState<string>('chat')
  const [debugPrompt, setDebugPrompt] = useState('')
  const [debugResponse, setDebugResponse] = useState('')
  const [isDebugLoading, setIsDebugLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Загружаем активное подключение при монтировании
  useEffect(() => {
    getActiveConnection().then(setConnection)
  }, [])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Always use tools for all messages
      const chatResponse = await fetchWithTools([...messages, userMessage], AVAILABLE_TOOLS)

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: chatResponse.message,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])

      // Handle tool calls
      if (chatResponse.toolCalls && chatResponse.toolCalls.length > 0) {
        await handleToolCalls(chatResponse.toolCalls)
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Произошла ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleToolCalls = async (toolCalls: ToolCall[]) => {
    for (const toolCall of toolCalls) {
      if (toolCall.function.name === 'add_new_object') {
        try {
          const args = JSON.parse(toolCall.function.arguments)
          onObjectAdded(args)

          // Add tool result message
          const toolMessage: ChatMessage = {
            role: 'assistant',
            content: `✅ Объект "${args.name}" был добавлен в сцену.`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, toolMessage])
        } catch (error) {
          console.error('Tool execution error:', error)
          const errorMessage: ChatMessage = {
            role: 'assistant',
            content: `❌ Ошибка при добавлении объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, errorMessage])
        }
      }
    }
  }

  // Обновляет модель в активном подключении
  const handleModelChange = async (model: string) => {
    if (!connection) return
    const updated = { ...connection, model }
    await upsertConnection(updated)
    setConnection(updated)
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  const handleDebugSend = async () => {
    if (!debugPrompt.trim() || isDebugLoading) return

    setIsDebugLoading(true)
    try {
      const chatResponse = await fetchWithTools([{
        role: 'user',
        content: debugPrompt.trim(),
        timestamp: new Date()
      }], AVAILABLE_TOOLS)

      if (chatResponse.toolCalls && chatResponse.toolCalls.length > 0) {
        const toolCall = chatResponse.toolCalls[0]
        if (toolCall.function.name === 'add_new_object') {
          setDebugResponse(toolCall.function.arguments)
        }
      }
    } catch (error) {
      console.error('Debug error:', error)
      setDebugResponse(`{"error": "${error instanceof Error ? error.message : 'Неизвестная ошибка'}"}`)
    } finally {
      setIsDebugLoading(false)
    }
  }

  const handleApplyDebugObject = () => {
    try {
      const objectData = JSON.parse(debugResponse)
      if (objectData.error) {
        console.error('Cannot apply object with error:', objectData.error)
        return
      }
      onObjectAdded(objectData)
    } catch (error) {
      console.error('Failed to parse debug response:', error)
    }
  }

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

  return (
    <Stack h="100%" gap={0}>
      <Paper p="md" withBorder>
        <Group justify="space-between" align="center">
          <Group gap="xs" align="center">
            <Text size="lg" fw={500}>
              Чат с агентом
            </Text>
            {connection && (
              <Badge variant="light" color="gray">
                {connection.name}
              </Badge>
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
                  onChange={val => val && handleModelChange(val)}
                />
              </Box>
            )}
          </Group>
        </Group>
      </Paper>

      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'chat')} flex={1}>
        <Tabs.List>
          <Tabs.Tab value="chat">
            Чат
          </Tabs.Tab>
          <Tabs.Tab value="debug">
            Отладка
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="chat" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <ScrollArea flex={1} p="md" ref={scrollAreaRef}>
            <Stack gap="sm">
              {messages.length === 0 && (
                <Paper p="md" withBorder style={{ backgroundColor: '#4e4e4e' }}>
                  <Text c="white" ta="center">
                    Попросите агента добавить объект в сцену...
                  </Text>
                </Paper>
              )}

              {messages.map((message, index) => (
                <Paper
                  key={index}
                  p="md"
                  withBorder
                  style={{
                    backgroundColor: message.role === 'user' ? '#303030' : '#34343e',
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
                    <Text size="sm" fw={500} c={getMessageColor(message.role)}>
                      {message.role === 'user' ? 'Вы' : 'Агент'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {message.timestamp.toLocaleTimeString()}
                    </Text>
                  </Group>
                  <Text style={{ whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </Text>
                </Paper>
              ))}

              {isLoading && (
                <Paper p="md" withBorder style={{ backgroundColor: '#31484a' }}>
                  <Group gap="xs">
                    <ActionIcon size="sm" variant="subtle" color="green">
                      <IconRobot size={16} />
                    </ActionIcon>
                    <Text size="sm" fw={500} c="green">
                      Агент
                    </Text>
                  </Group>
                  <Text c="dimmed" fs="italic">
                    Думаю...
                  </Text>
                </Paper>
              )}
            </Stack>
          </ScrollArea>

          <Paper p="md" withBorder>
            <Group gap="sm">
              <TextInput
                flex={1}
                placeholder="Попросите добавить объект..."
                value={inputValue}
                onChange={(e) => setInputValue(e.currentTarget.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                loading={isLoading}
                leftSection={<IconSend size={16} />}
              >
                Отправить
              </Button>
            </Group>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="debug" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Stack flex={1} gap="md" p="md">
            <Paper p="md" withBorder>
              <Text size="sm" mb="sm" fw={500}>
                Промпт для агента:
              </Text>
              <Group gap="sm">
                <TextInput
                  flex={1}
                  placeholder="Введите промпт для создания объекта..."
                  value={debugPrompt}
                  onChange={(e) => setDebugPrompt(e.currentTarget.value)}
                  disabled={isDebugLoading}
                />
                <Button
                  onClick={handleDebugSend}
                  disabled={!debugPrompt.trim() || isDebugLoading}
                  loading={isDebugLoading}
                  leftSection={<IconSend size={16} />}
                >
                  Отправить
                </Button>
              </Group>
            </Paper>

            <Paper p="md" withBorder flex={1} style={{ display: 'flex', flexDirection: 'column' }}>
              <Text size="sm" mb="sm" fw={500}>
                Ответ агента (JSON):
              </Text>
              <Textarea
                flex={1}
                placeholder="Здесь будет JSON ответ от агента..."
                value={debugResponse}
                onChange={(e) => setDebugResponse(e.currentTarget.value)}
                minRows={10}
                maxRows={15}
                autosize
                style={{
                  fontFamily: 'monospace',
                  fontSize: '10px',
                }}
              />
              <Group justify="flex-end" mt="sm">
                <Button
                  onClick={handleApplyDebugObject}
                  disabled={!debugResponse.trim()}
                  variant="filled"
                >
                  Применить
                </Button>
              </Group>
            </Paper>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
