import React, { useState } from 'react'
import { Stack, Paper, Text, Group, TextInput, Button, Textarea } from '@mantine/core'
import { IconSend } from '@tabler/icons-react'
import type { LangChainChatService } from '@/shared/lib/langchain'
import { nanoid } from 'nanoid'

interface SceneDebugPanelProps {
  debugChatService: LangChainChatService | null
  onObjectCreated?: (objectData: any) => void
}

export const SceneDebugPanel: React.FC<SceneDebugPanelProps> = ({
  debugChatService,
  onObjectCreated
}) => {
  const [debugPrompt, setDebugPrompt] = useState('')
  const [debugResponse, setDebugResponse] = useState('')
  const [isDebugLoading, setIsDebugLoading] = useState(false)

  /**
   * Отправляет промпт в отладочный сервис и отображает результат.
   */
  const handleDebugSend = async () => {
    if (!debugPrompt.trim() || isDebugLoading || !debugChatService) return

    setIsDebugLoading(true)
    try {
      // Set up callback to capture tool execution results
      let toolExecutionResult: string | null = null
      let objectData: string | null = null
      debugChatService.setToolCallback((toolName: string, result: unknown) => {
        const res = result as { object?: unknown }
        if (toolName === 'add_new_object') {
          toolExecutionResult = JSON.stringify(res, null, 2)
          objectData = JSON.stringify(res.object, null, 2)
        }
      })

      // Отправляем только пользовательское сообщение, системный промпт задан при инициализации
      const response = await debugChatService.chat([
        {
          id: nanoid(),
          role: 'user',
          content: debugPrompt.trim(),
          timestamp: new Date()
        }
      ])

      // If tool was executed, show the result; otherwise show the agent's response
      if (toolExecutionResult) {
        setDebugResponse(objectData || toolExecutionResult)
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

  /**
   * Применяет объект, сформированный в отладочном JSON.
   */
  const handleApplyDebugObject = async () => {
    try {
      const objectData = JSON.parse(debugResponse)
      if (objectData.error) {
        console.error('Cannot apply object with error:', objectData.error)
        return
      }
      // Вызываем callback для создания объекта
      onObjectCreated?.(objectData)
    } catch (error) {
      console.error('Failed to apply debug object:', error)
    }
  }

  return (
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
  )
}