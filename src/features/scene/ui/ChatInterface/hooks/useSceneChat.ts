import { useCallback, useEffect, useRef } from 'react'
import { useChat } from '@/shared/entities/chat'
import type { ChatMessage, ChatConfig } from '@/shared/entities/chat'
import { langChainChatService, LangChainChatService } from '@/shared/lib/langchain'
import { getActiveConnection, upsertConnection } from '@/shared/lib/openAISettings'
import type { OpenAISettingsConnection } from '@/shared/lib/openAISettings'
import { createAddNewObjectTool } from '@/features/scene/lib/ai/tools'
import type { GfxObjectWithTransform } from '@/entities'
import { nanoid } from 'nanoid'

interface UseSceneChatOptions {
  onObjectAdded?: (object: GfxObjectWithTransform, toolName: string) => void
  debugMode?: boolean
}

interface UseSceneChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  sendMessage: (content: string) => Promise<void>
  addMessage: (message: ChatMessage) => void
  clearMessages: () => void
  connection: OpenAISettingsConnection | null
  updateModel: (model: string) => Promise<void>
  debugChatService: LangChainChatService | null
}

export const useSceneChat = (options: UseSceneChatOptions = {}): UseSceneChatReturn => {
  const { onObjectAdded, debugMode = true } = options
  const debugChatServiceRef = useRef<LangChainChatService | null>(null)
  const connectionRef = useRef<OpenAISettingsConnection | null>(null)

  // Конфигурация чата для scene
  const chatConfig: ChatConfig = {
    feature: 'scene',
    tools: [], // Tools регистрируются через LangChain сервис
    systemPrompt: 'You are a helpful assistant that can use tools to interact with a 3D scene.',
    debugMode
  }

  const baseChat = useChat({
    config: chatConfig,
    generateMessageId: () => nanoid()
  })

  // Scene-специфичная обработка отправки сообщений
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || baseChat.isLoading) return

    const userMessage: ChatMessage = {
      id: nanoid(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    baseChat.addMessage(userMessage)

    try {
      // Используем LangChain агент для обработки сообщений
      const langChainResponse = await langChainChatService.chat([...baseChat.messages, userMessage])

      const assistantMessage: ChatMessage = {
        id: nanoid(),
        role: 'assistant',
        content: langChainResponse.message,
        timestamp: new Date()
      }
      baseChat.addMessage(assistantMessage)

    } catch (error) {
      console.error('Scene chat error:', error)
      const errorMessage: ChatMessage = {
        id: nanoid(),
        role: 'assistant',
        content: `Произошла ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        timestamp: new Date()
      }
      baseChat.addMessage(errorMessage)
    }
  }, [baseChat])

  // Scene-специфичный callback для обработки tool calls
  const handleToolCallback = useCallback((toolName: string, result: unknown) => {
    const res = result as { success?: boolean; object?: GfxObjectWithTransform }
    
    if (toolName === 'add_new_object' || toolName === 'add_object_from_library') {
      if (res.success && res.object) {
        // Вызываем пользовательский callback
        onObjectAdded?.(res.object, toolName)
        
        // Добавляем сообщение об успешном добавлении
        const icon = toolName === 'add_new_object' ? '✅' : '📘'
        const successMessage: ChatMessage = {
          id: nanoid(),
          role: 'assistant',
          content: `${icon} ${toolName === 'add_new_object' ? 'Новый объект' : 'Объект из библиотеки'} "${res.object.name}" был добавлен в сцену.`,
          timestamp: new Date()
        }
        baseChat.addMessage(successMessage)
      }
    }
  }, [onObjectAdded, baseChat.addMessage])

  // Обновление модели
  const updateModel = useCallback(async (model: string) => {
    if (!connectionRef.current) return
    
    const updated = { ...connectionRef.current, model }
    await upsertConnection(updated)
    connectionRef.current = updated

    // Переинициализируем LangChain сервис с новой моделью
    try {
      await langChainChatService.updateConnection()
      console.log('LangChain сервис обновлен с новой моделью:', model)
    } catch (error) {
      console.error('Ошибка обновления LangChain сервиса:', error)
      // Добавляем сообщение об ошибке смены модели
      const errorMessage: ChatMessage = {
        id: nanoid(),
        role: 'assistant',
        content: `❌ Ошибка смены модели: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        timestamp: new Date()
      }
      baseChat.addMessage(errorMessage)
    }
  }, [baseChat.addMessage])

  // Инициализация сервисов
  useEffect(() => {
    const initializeServices = async () => {
      const activeConnection = await getActiveConnection()
      connectionRef.current = activeConnection

      // Инициализируем основной LangChain сервис
      try {
        await langChainChatService.initialize()
        langChainChatService.setToolCallback(handleToolCallback)
        console.log('LangChain сервис инициализирован с инструментами:', langChainChatService.getRegisteredTools())
      } catch (error) {
        console.error('Ошибка инициализации LangChain сервиса:', error)
        
        const errorMessage: ChatMessage = {
          id: nanoid(),
          role: 'assistant',  
          content: `❌ Ошибка инициализации чата: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
          timestamp: new Date()
        }
        baseChat.addMessage(errorMessage)
      }

      // Инициализируем отладочный LangChain сервис только с createAddNewObjectTool
      if (debugMode) {
        try {
          const debugService = new LangChainChatService(
            'Сразу же выполни tool по запросу пользователя, не уточняя детали'
          )
          await debugService.initialize()
          debugService.clearTools()
          debugService.registerDynamicTool(createAddNewObjectTool())
          debugChatServiceRef.current = debugService
          console.log('Debug LangChain сервис инициализирован с инструментами:', debugService.getRegisteredTools())
        } catch (error) {
          console.error('Ошибка инициализации отладочного LangChain сервиса:', error)
        }
      }
    }

    initializeServices()
  }, [debugMode, handleToolCallback, baseChat.addMessage])

  return {
    ...baseChat,
    sendMessage,
    connection: connectionRef.current,
    updateModel,
    debugChatService: debugChatServiceRef.current
  }
}