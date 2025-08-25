import { useCallback, useEffect, useRef, useState } from 'react'
import { useChat } from '@/shared/entities/chat'
import type { ChatMessage, ChatConfig } from '@/shared/entities/chat'
import { getOrCreateLangChainChatService, LangChainChatService } from '@/shared/lib/langchain'
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
  isInitialized: boolean
  sendMessage: (content: string) => Promise<void>
  addMessage: (message: ChatMessage) => void
  clearMessages: () => void
  connection: OpenAISettingsConnection | null
  updateModel: (model: string) => Promise<void>
  debugChatService: LangChainChatService | null
}

export const useSceneChat = (options: UseSceneChatOptions = {}): UseSceneChatReturn => {
  const { onObjectAdded, debugMode = true } = options
  const sceneChatServiceRef = useRef<LangChainChatService | null>(null)
  const debugChatServiceRef = useRef<LangChainChatService | null>(null)
  const connectionRef = useRef<OpenAISettingsConnection | null>(null)
  const mainServiceInitializedRef = useRef(false)
  const debugServiceInitializedRef = useRef(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Системный промпт для scene editor
  const SCENE_SYSTEM_PROMPT = 'You are a helpful assistant that can use tools to interact with a 3D scene. ' +
    'When user wants to add new object to scene, first search existing objects in a library, if not found - create it. ' +
    'When creating primitives always generate meaningful Russian names.'

  // Конфигурация чата для scene
  const chatConfig: ChatConfig = {
    feature: 'scene',
    tools: [], // Tools регистрируются через LangChain сервис
    systemPrompt: SCENE_SYSTEM_PROMPT,
    debugMode
  }

  const baseChat = useChat({
    config: chatConfig,
    generateMessageId: () => nanoid()
  })

  /**
   * Отправляет сообщение в LangChain сервис и управляет состоянием загрузки.
   * Пока агент обрабатывает запрос, интерфейс блокируется и отображается индикатор загрузки.
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: nanoid(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    baseChat.addMessage(userMessage)
    setIsLoading(true)

    try {
      // Проверяем, инициализирован ли сервис. Ленивая инициализация удалена,
      // единственный путь инициализации — через useEffect ниже.
      if (!mainServiceInitializedRef.current || !sceneChatServiceRef.current) {
        throw new Error('Scene chat service not initialized')
      }
      
      const langChainResponse = await sceneChatServiceRef.current.chat([...baseChat.messages, userMessage])

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
    } finally {
      setIsLoading(false)
    }
  }, [baseChat, isLoading])

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

  const handleToolCallbackRef = useRef(handleToolCallback)

  // Синхронизация актуального callback'а инструментов с сервисом LangChain
  useEffect(() => {
    handleToolCallbackRef.current = handleToolCallback
    if (sceneChatServiceRef.current) {
      sceneChatServiceRef.current.setToolCallback(handleToolCallback)
    }
  }, [handleToolCallback])

  // Обновление модели: сохраняет новую модель и переинициализирует сервис
  const updateModel = useCallback(async (model: string) => {
    if (!connectionRef.current) return
    
    const updated = { ...connectionRef.current, model }
    await upsertConnection(updated)
    connectionRef.current = updated

    // Переинициализируем LangChain сервис с новой моделью
    try {
      if (sceneChatServiceRef.current) {
        await sceneChatServiceRef.current.updateConnection()
        console.log('Scene LangChain сервис обновлен с новой моделью:', model)
      }
    } catch (error) {
      console.error('Ошибка обновления Scene LangChain сервиса:', error)
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

  // Инициализация основного LangChain сервиса
  useEffect(() => {
    const initializeMainService = async () => {
      if (mainServiceInitializedRef.current) return
      
      try {
        const activeConnection = await getActiveConnection()
        connectionRef.current = activeConnection

        // Получаем синглтон экземпляр для scene editor
        sceneChatServiceRef.current = getOrCreateLangChainChatService('scene', SCENE_SYSTEM_PROMPT)
        // Идемпотентная инициализация внутри сервиса, StrictMode-дупликаты игнорируются
        await sceneChatServiceRef.current.initialize()
        sceneChatServiceRef.current.setToolCallback(handleToolCallbackRef.current)

        // Помечаем сервис как инициализированный для UI
        mainServiceInitializedRef.current = true
        setIsInitialized(true)
      } catch (error) {
        console.error('Ошибка инициализации Scene LangChain сервиса:', error)

        const errorMessage: ChatMessage = {
          id: nanoid(),
          role: 'assistant',
          content: `❌ Ошибка инициализации Scene чата: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
          timestamp: new Date()
        }
        baseChat.addMessage(errorMessage)
        
        // Сбрасываем флаг инициализации, чтобы можно было повторить попытку
        mainServiceInitializedRef.current = false
      }
    }

    initializeMainService()
  }, [baseChat.addMessage])

  // Инициализация отладочного сервиса отдельно
  useEffect(() => {
    if (!debugMode) {
      debugChatServiceRef.current = null
      debugServiceInitializedRef.current = false
      return
    }

    const initializeDebugService = async () => {
      if (debugServiceInitializedRef.current) return

      try {
        const debugService = getOrCreateLangChainChatService(
          'scene-debug',
          'Сразу же выполни tool по запросу пользователя, не уточняя детали',
          { autoLoadToolsFromRegistry: false }
        )
        await debugService.initialize()
        // Регистрируем инструмент отладки один раз, чтобы в StrictMode не было дубликатов и логов
        const alreadyHasDebugTool = debugService.getRegisteredTools().includes('add_new_object')
        if (!alreadyHasDebugTool) {
          debugService.clearTools()
          debugService.registerDynamicTool(createAddNewObjectTool())
          console.log('Debug LangChain сервис инициализирован с инструментами:', debugService.getRegisteredTools())
        }
        debugChatServiceRef.current = debugService
        debugServiceInitializedRef.current = true
      } catch (error) {
        console.error('Ошибка инициализации отладочного LangChain сервиса:', error)
        debugServiceInitializedRef.current = false
      }
    }

    initializeDebugService()
  }, [debugMode])

  return {
    ...baseChat,
    isLoading,
    isInitialized,
    sendMessage,
    connection: connectionRef.current,
    updateModel,
    debugChatService: debugChatServiceRef.current
  }
}
