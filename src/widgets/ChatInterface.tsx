import { useState, useEffect, useRef } from 'react'
import { Stack, Paper, TextInput, Button, Text, Group, ScrollArea, ActionIcon, Badge, Select, Box, Tabs, Textarea } from '@mantine/core'
import {
  IconSend,
  IconUser,
  IconRobot,
  IconArrowsDiagonalMinimize2
} from '@tabler/icons-react'
import { fetchWithTools, AVAILABLE_TOOLS } from '@/shared/lib/openAIAPI'
import { addNewObjectTool, createAddNewObjectTool } from '@/features/scene/lib/ai/tools'
import type { ChatMessage, ToolCall } from '@/shared/lib/openAIAPI'
import { langChainChatService, LangChainChatService } from '@/shared/lib/langchain'
import { getActiveConnection, upsertConnection, getProviderModels } from '@/shared/lib/openAISettings'
import type { OpenAISettingsConnection } from '@/shared/lib/openAISettings'
import type {GFXObjectWithTransform} from "@/entities";


interface Props {
  onCollapse?: () => void
}

export const ChatInterface: React.FC<Props> = ({ onCollapse }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [connection, setConnection] = useState<OpenAISettingsConnection | null>(null)
  const [activeTab, setActiveTab] = useState<string>('chat')
  const [debugPrompt, setDebugPrompt] = useState('')
  const [debugResponse, setDebugResponse] = useState('')
  const [isDebugLoading, setIsDebugLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const debugChatServiceRef = useRef<LangChainChatService | null>(null)

  /**
   * Выполняет инструмент add_new_object и возвращает созданный объект
   */
  const executeAddNewObject = async (args: any): Promise<GFXObjectWithTransform> => {
    const result = await addNewObjectTool.func(args)
    const parsed = JSON.parse(result)
    if (parsed.success && parsed.object) {
      return parsed.object as GFXObjectWithTransform
    }
    throw new Error(parsed.error || 'Ошибка выполнения инструмента')
  }

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current?.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth', // по желанию
      });
      //scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Загружаем активное подключение и инициализируем LangChain сервис при монтировании
  useEffect(() => {
    const initializeServices = async () => {
      const activeConnection = await getActiveConnection()
      setConnection(activeConnection)

      // Инициализируем основной LangChain сервис
      try {
        await langChainChatService.initialize()

        // Устанавливаем общий callback для инструментов
        langChainChatService.setToolCallback((toolName: string, result: any) => {
          // Обрабатываем успешное добавление объектов
          if (toolName === 'add_new_object') {
            if (result.success && result.object) {
              // Добавляем сообщение об успешном добавлении
              const successMessage: ChatMessage = {
                role: 'assistant',
                content: `✅ Новый объект "${result.object.name}" был добавлен в сцену.`,
                timestamp: new Date()
              }
              setMessages(prev => [...prev, successMessage])
            }
          }
          if (toolName === 'add_object_from_library') {
            if (result.success && result.object) {
              // Добавляем сообщение об успешном добавлении
              const successMessage: ChatMessage = {
                role: 'assistant',
                content: `📘 Объект "${result.object.name}" из библиотеки был добавлен в сцену.`,
                timestamp: new Date()
              }
              setMessages(prev => [...prev, successMessage])
            }
          }

        })

        console.log('LangChain сервис инициализирован с инструментами:', langChainChatService.getRegisteredTools())
      } catch (error) {
        console.error('Ошибка инициализации LangChain сервиса:', error)

        // Добавляем сообщение об ошибке инициализации для пользователя
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: `❌ Ошибка инициализации чата: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }

      // Инициализируем отладочный LangChain сервис только с createAddNewObjectTool
      try {
        const debugService = new LangChainChatService()
        await debugService.initialize()
        debugService.clearTools() // Очищаем все инструменты
        debugService.registerDynamicTool(createAddNewObjectTool()) // Добавляем только один инструмент
        debugChatServiceRef.current = debugService
        console.log('Debug LangChain сервис инициализирован с инструментами:', debugService.getRegisteredTools())
      } catch (error) {
        console.error('Ошибка инициализации отладочного LangChain сервиса:', error)
      }
    }

    initializeServices()
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
      // Используем LangChain агент для обработки сообщений
      const langChainResponse = await langChainChatService.chat([...messages, userMessage])

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: langChainResponse.message,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])

      // LangChain автоматически обрабатывает инструменты, дополнительная обработка не требуется
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


  // Обновляет модель в активном подключении и переинициализирует LangChain сервис
  const handleModelChange = async (model: string) => {
    if (!connection) return
    const updated = { ...connection, model }
    await upsertConnection(updated)
    setConnection(updated)

    // Переинициализируем LangChain сервис с новой моделью
    try {
      await langChainChatService.updateConnection()
      console.log('LangChain сервис обновлен с новой моделью:', model)
    } catch (error) {
      console.error('Ошибка обновления LangChain сервиса:', error)
      // Добавляем сообщение об ошибке смены модели
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `❌ Ошибка смены модели: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  const handleDebugSend = async () => {
    if (!debugPrompt.trim() || isDebugLoading || !debugChatServiceRef.current) return

    setIsDebugLoading(true)
    try {
      // Use the debug LangChain service with only createAddNewObjectTool
      const debugService = debugChatServiceRef.current

      // Set up callback to capture tool execution results
      let toolExecutionResult: string | null = null
      let objectData: string | null = null
      debugService.setToolCallback((toolName: string, result: any) => {
        if (toolName === 'add_new_object') {
          toolExecutionResult = JSON.stringify(result, null, 2)
          objectData = JSON.stringify(result.object, null, 2)
        }
      })

      // Send message to debug service
      const response = await debugService.chat([
        {
          role: 'system',
          content: 'Сразу же выполни tool по запросу пользователя, не уточняя детали',
          timestamp: new Date()
        },
        {
          role: 'user',
          content: debugPrompt.trim(),
          timestamp: new Date()
        }
      ])

      // If tool was executed, show the result; otherwise show the agent's response
      if (toolExecutionResult) {
        setDebugResponse(objectData)
      } else {
        setDebugResponse(`{"message": "${response.message}", "note": "Агент не вызвал инструмент создания объекта"}`)
      }

    } catch (error) {
      console.error('Debug error:', error)
      setDebugResponse(`{"error": "${error instanceof Error ? error.message : 'Неизвестная ошибка'}"}`)
    } finally {
      setIsDebugLoading(false)
    }
  }

  const handleApplyDebugObject = async () => {
    try {
      const objectData = JSON.parse(debugResponse)
      if (objectData.error) {
        console.error('Cannot apply object with error:', objectData.error)
        return
      }
      // Используем LangChain инструмент для создания объекта из debug данных
      const gfxObject = await executeAddNewObject(objectData)
    } catch (error) {
      console.error('Failed to apply debug object:', error)
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
    <Stack  gap={0} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',  height: '100%',  minHeight: 0,   }}>
      <Paper p="md" withBorder>

        <Group justify="space-between" align="center" >
          <Group gap="xs" align="center" wrap={"nowrap"}  style={{ width: '100%' }}>
            <Group flex={1} style={{flexGrow: 1}}>
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
                  onChange={val => val && handleModelChange(val)}
                />
              </Box>
            )}

          </Group>
        </Group>
      </Paper>

      <Tabs
          value={activeTab}
          onChange={(value) => setActiveTab(value || 'chat')}
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

        <Tabs.Panel value="chat" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'  }}>
          <ScrollArea p="sm" ref={scrollAreaRef} style={{ flex: 1, minHeight: 0 }}>
            <Stack gap="sm">
              {messages.length === 0 && (
                <Paper p="sm" withBorder style={{ backgroundColor: '#4e4e4e' }}>
                  <Text c="white" ta="center" style={{fontSize: '0.8rem'}}>
                    Попросите агента добавить объект в сцену...
                  </Text>
                </Paper>
              )}

              {messages.map((message, index) => (
                <Paper
                  key={index}
                  p="sm"
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
                    <Text size="sm" fw={500} style={{fontSize: '0.8rem'}} c={getMessageColor(message.role)}>
                      {message.role === 'user' ? 'Вы' : 'Агент'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {message.timestamp.toLocaleTimeString()}
                    </Text>
                  </Group>
                  <Text style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem'}}>
                    {message.content}
                  </Text>
                </Paper>
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
                  <Text c="dimmed" fs="italic" style={{fontSize: '0.8rem'}}>
                    Думаю...
                  </Text>
                </Paper>
              )}
            </Stack>
          </ScrollArea>

          <Paper p="md" withBorder style={{flexShrink: 0}}>
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

        <Tabs.Panel value="debug" style={{ flex: 1, display: 'flex',
          flexDirection: 'column', overflow: 'hidden' }}>
          <Stack gap="md" p="md" style={{ flex: 1, minHeight: 0 }}>
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
