/**
 * Хук для chat функциональности в ObjectEditor
 */

import { useCallback, useMemo, useEffect, useState, useRef } from 'react'
import { useChat } from '@/shared/entities/chat'
import type { ChatConfig, ChatMessage } from '@/shared/entities/chat'
import { createLangChainChatService, LangChainChatService } from '@/shared/lib/langchain'
import { createObjectEditorTools } from '@/features/object-editor/lib/ai/tools'
import { useObjectContextPrompt } from './useObjectContextPrompt'
import { nanoid } from 'nanoid'

interface UseObjectChatOptions {
  mode?: 'page' | 'modal'
}

export const useObjectChat = (options: UseObjectChatOptions = {}) => {
  const { mode = 'page' } = options
  const { systemPrompt, objectInfo } = useObjectContextPrompt()
  const objectChatServiceRef = useRef<LangChainChatService | null>(null)
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
      if (!objectChatServiceRef.current) {
        throw new Error('Object chat service not initialized')
      }
      const langChainResponse = await objectChatServiceRef.current.chat([...baseChatState.messages, userMessage])

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


  // Инициализация LangChain сервиса при монтировании
  useEffect(() => {
    const initializeService = async () => {
      try {
        // Создаем отдельный экземпляр для object editor
        objectChatServiceRef.current = createLangChainChatService(systemPrompt)
        await objectChatServiceRef.current.initialize()

        const objectEditorTools = createObjectEditorTools()
        objectEditorTools.forEach(tool => {
          objectChatServiceRef.current!.registerDynamicTool(tool)
        })

        console.log('ObjectEditor LangChain сервис инициализирован с', objectEditorTools.length, 'инструментами')
      } catch (error) {
        console.error('Ошибка инициализации ObjectEditor LangChain сервиса:', error)

        const errorMessage: ChatMessage = {
          id: nanoid(),
          role: 'assistant',
          content: `❌ Ошибка инициализации ObjectEditor чата: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
          timestamp: new Date()
        }
        baseChatState.addMessage(errorMessage)
      }
    }

    initializeService()
  }, [baseChatState.addMessage, systemPrompt])

  return {
    ...baseChatState,
    isLoading,
    sendMessage, // Переопределенный sendMessage
    objectInfo,
    isCompactMode: mode === 'modal'
  }
}

