/**
 * Хук для chat функциональности в ObjectEditor
 */

import { useCallback, useMemo, useEffect, useState } from 'react'
import { useChat } from '@/shared/entities/chat'
import type { ChatConfig, ChatMessage } from '@/shared/entities/chat'
import { langChainChatService } from '@/shared/lib/langchain'
import { createObjectEditorTools } from '@/features/object-editor/lib/ai/tools'
import { useObjectContextPrompt } from './useObjectContextPrompt'
import { nanoid } from 'nanoid'

interface UseObjectChatOptions {
  mode?: 'page' | 'modal'
}

export const useObjectChat = (options: UseObjectChatOptions = {}) => {
  const { mode = 'page' } = options
  const { systemPrompt, objectInfo, contextualHints } = useObjectContextPrompt()
  const [isLoading, setIsLoading] = useState(false)

  // Конфигурация чата для object-editor
  const chatConfig: ChatConfig = useMemo(() => ({
    feature: 'object-editor',
    tools: [], // LangChain tools регистрируются отдельно
    systemPrompt,
    debugMode: false,
    maxMessages: 50,
    autoScroll: true
  }), [systemPrompt])

  // Базовый useChat без отправки сообщений
  const baseChatState = useChat({
    config: chatConfig,
    generateMessageId: () => nanoid()
  })

  // Переопределённая функция отправки сообщений
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
      // Используем LangChain агент для обработки сообщений
      const langChainResponse = await langChainChatService.chat([...baseChatState.messages, userMessage])

      const assistantMessage: ChatMessage = {
        id: nanoid(),
        role: 'assistant',
        content: langChainResponse.message,
        timestamp: new Date()
      }
      baseChatState.addMessage(assistantMessage)

    } catch (error) {
      console.error('ObjectEditor chat error:', error)
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

  // Добавление системного сообщения с контекстом
  const addSystemMessage = useCallback((content: string) => {
    const systemMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'system',
      content,
      timestamp: new Date()
    }
    baseChatState.addMessage(systemMessage)
  }, [baseChatState])

  // Информационное сообщение с подсказками
  const showContextualHints = useCallback(() => {
    if (contextualHints.length > 0) {
      const hintsMessage = `💡 Подсказки:\n${contextualHints.map(hint => `• ${hint}`).join('\n')}`
      addSystemMessage(hintsMessage)
    }
  }, [contextualHints, addSystemMessage])

  // Инициализация LangChain сервиса при монтировании
  useEffect(() => {
    const initializeService = async () => {
      try {
        await langChainChatService.initialize()

        // Очищаем существующие tools и регистрируем наши
        langChainChatService.clearTools()

        const objectEditorTools = createObjectEditorTools()
        objectEditorTools.forEach(tool => {
          langChainChatService.registerDynamicTool(tool)
        })

        console.log('ObjectEditor LangChain сервис инициализирован с', objectEditorTools.length, 'инструментами')
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

  return {
    ...baseChatState,
    isLoading,
    sendMessage, // Переопределенный sendMessage
    objectInfo,
    contextualHints,
    addSystemMessage,
    showContextualHints,
    isCompactMode: mode === 'modal'
  }
}

