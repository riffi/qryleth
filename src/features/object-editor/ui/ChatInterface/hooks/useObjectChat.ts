/**
 * Хук для chat функциональности в ObjectEditor
 */

import { useCallback, useMemo, useEffect, useRef, useState } from 'react'
import { useChat } from '@/shared/entities/chat'
import type { ChatConfig, ChatMessage } from '@/shared/entities/chat'
import { langChainChatService } from '@/shared/lib/langchain'
import { useObjectStore } from '@/features/object-editor'
import { useObjectContextPrompt } from './useObjectContextPrompt'
import { nanoid } from 'nanoid'

interface UseObjectChatOptions {
  mode?: 'page' | 'modal'
  onPrimitiveAdded?: (primitive: any) => void
  onMaterialCreated?: (material: any) => void
  onObjectModified?: (modifications: any) => void
}

export const useObjectChat = (options: UseObjectChatOptions = {}) => {
  const { mode = 'page', onPrimitiveAdded, onMaterialCreated, onObjectModified } = options

  const { systemPrompt, objectInfo, contextualHints } = useObjectContextPrompt()
  const [isLoading, setIsLoading] = useState(false)

  // Конфигурация чата для object-editor
  const chatConfig: ChatConfig = useMemo(() => ({
    feature: 'object-editor',
    tools: [], // LangChain tools регистрируются через реестр
    systemPrompt,
    debugMode: false,
    maxMessages: 50,
    autoScroll: true
  }), [systemPrompt])

  const baseChatState = useChat({
    config: chatConfig,
    generateMessageId: () => nanoid()
  })

  /**
   * Отправляет сообщение пользователю и обрабатывает ответ агента
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: nanoid(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    baseChatState.addMessage(userMessage)
    setIsLoading(true)

    try {
      const response = await langChainChatService.chat([...baseChatState.messages, userMessage])

      const assistantMessage: ChatMessage = {
        id: nanoid(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date()
      }
      baseChatState.addMessage(assistantMessage)
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: nanoid(),
        role: 'assistant',
        content: `Произошла ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        timestamp: new Date()
      }
      baseChatState.addMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [baseChatState, isLoading])

  // Callback, вызываемый после выполнения инструментов
  const handleToolCallback = useCallback((toolName: string, result: unknown) => {
    try {
      const data = typeof result === 'string' ? JSON.parse(result) : result
      const store = useObjectStore.getState()
      switch (toolName) {
        case 'add_primitives':
          if (data.success && Array.isArray(data.indices)) {
            data.indices.forEach((i: number) => {
              const primitive = store.primitives[i]
              if (primitive) onPrimitiveAdded?.(primitive)
            })
          }
          break
        case 'create_material':
          if (data.success && data.materialUuid) {
            const material = store.materials.find(m => m.uuid === data.materialUuid)
            if (material) onMaterialCreated?.(material)
          }
          break
        default:
          onObjectModified?.({ tool: toolName, result: data })
      }
    } catch (error) {
      console.error('ObjectEditor tool callback error:', error)
    }
  }, [onPrimitiveAdded, onMaterialCreated, onObjectModified])

  const handleToolCallbackRef = useRef(handleToolCallback)

  // Синхронизация callback инструмента с сервисом LangChain
  useEffect(() => {
    handleToolCallbackRef.current = handleToolCallback
    langChainChatService.setToolCallback(handleToolCallback)
  }, [handleToolCallback])

  // Инициализация LangChain сервиса
  useEffect(() => {
    const initializeService = async () => {
      try {
        await langChainChatService.initialize()
        langChainChatService.setToolCallback(handleToolCallbackRef.current)
        console.log('ObjectEditor LangChain сервис инициализирован с', langChainChatService.getRegisteredTools())
      } catch (error) {
        console.error('Ошибка инициализации ObjectEditor LangChain сервиса:', error)

        const errorMessage: ChatMessage = {
          id: nanoid(),
          role: 'assistant',
          content: `❌ Ошибка инициализации чата: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
          timestamp: new Date()
        }
        baseChatState.addMessage(errorMessage)
      }
    }

    initializeService()
  }, [baseChatState.addMessage])

  // Добавление системного сообщения
  const addSystemMessage = useCallback((content: string) => {
    const systemMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'system',
      content,
      timestamp: new Date()
    }
    baseChatState.addMessage(systemMessage)
  }, [baseChatState])

  // Показ подсказок
  const showContextualHints = useCallback(() => {
    if (contextualHints.length > 0) {
      const hintsMessage = `💡 Подсказки:\n${contextualHints.map(hint => `• ${hint}`).join('\n')}`
      addSystemMessage(hintsMessage)
    }
  }, [contextualHints, addSystemMessage])

  return {
    ...baseChatState,
    isLoading,
    sendMessage,
    objectInfo,
    contextualHints,
    addSystemMessage,
    showContextualHints,
    isCompactMode: mode === 'modal'
  }
}

