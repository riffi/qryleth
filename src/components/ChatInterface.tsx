import { useState, useEffect, useRef } from 'react'
import { Stack, Paper, TextInput, Button, Text, Box, Group, ScrollArea, ActionIcon, Badge } from '@mantine/core'
import { IconSend, IconUser, IconRobot, IconTool } from '@tabler/icons-react'
import { fetchWithTools, fetchSceneJSON, AVAILABLE_TOOLS } from '../utils/openAIAPI'
import type { ChatMessage, ToolCall } from '../utils/openAIAPI'
import type { SceneResponse } from '../types/scene'

interface Props {
  onSceneGenerated: (scene: SceneResponse) => void
  onObjectAdded: (object: any) => void
}

export const ChatInterface: React.FC<Props> = ({ onSceneGenerated, onObjectAdded }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFirstMessage, setIsFirstMessage] = useState(true)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

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
      if (isFirstMessage) {
        // First message - generate scene
        const sceneResponse = await fetchSceneJSON(userMessage.content)
        onSceneGenerated(sceneResponse)

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: 'Сцена успешно создана! Теперь вы можете попросить меня добавить новые объекты или изменить существующие.',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
        setIsFirstMessage(false)
      } else {
        // Subsequent messages - use tools
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

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
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
        <Group justify="space-between">
          <Text size="lg" fw={500}>
            Чат с агентом
          </Text>
          <Badge color={isFirstMessage ? 'orange' : 'blue'} variant="light">
            {isFirstMessage ? 'Создание сцены' : 'Редактирование'}
          </Badge>
        </Group>
      </Paper>

      <ScrollArea flex={1} p="md" ref={scrollAreaRef}>
        <Stack gap="sm">
          {messages.length === 0 && (
            <Paper p="md" withBorder style={{ backgroundColor: '#4e4e4e' }}>
              <Text c="white" ta="center">
                {isFirstMessage
                  ? 'Опишите сцену, которую хотите создать...'
                  : 'Начните диалог с агентом...'}
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
            placeholder={isFirstMessage ? "Опишите сцену..." : "Сообщение агенту..."}
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
    </Stack>
  )
}
