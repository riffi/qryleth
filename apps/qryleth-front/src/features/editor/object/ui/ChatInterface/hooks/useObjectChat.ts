/**
 * Хук для chat функциональности в ObjectEditor
 */

import { useCallback, useMemo, useEffect, useState, useRef } from 'react'
import { useChatWithStop } from '@/shared/entities/chat'
import type { ChatConfig, ChatMessage } from '@/shared/entities/chat'
import { getOrCreateLangChainChatService, LangChainChatService } from '@/shared/lib/langchain'
import { createObjectEditorTools } from '@/features/editor/object/lib/ai/tools'
import { useObjectContextPrompt } from './useObjectContextPrompt'
import { nanoid } from 'nanoid'

interface UseObjectChatOptions {
  mode?: 'page' | 'modal'
  onPrimitiveAdded?: (primitive: any) => void
  onMaterialCreated?: (material: any) => void
  onObjectModified?: (modifications: Record<string, unknown>) => void
}

export const useObjectChat = (options: UseObjectChatOptions = {}) => {
  const { mode = 'page', onPrimitiveAdded, onMaterialCreated, onObjectModified } = options
  const { systemPrompt, objectInfo } = useObjectContextPrompt()
  const objectChatServiceRef = useRef<LangChainChatService | null>(null)

  // Конфигурация чата для object-editor
  const chatConfig: ChatConfig = useMemo(() => ({
    feature: 'object-editor',
    tools: [], // LangChain tools регистрируются отдельно
    systemPrompt,
    debugMode: false,
    maxMessages: 50,
    autoScroll: true
  }), [systemPrompt])

  // Базовый useChatWithStop с поддержкой остановки
  const baseChatState = useChatWithStop({
    config: chatConfig,
    generateMessageId: () => nanoid()
  })

  // Переопределённая функция отправки сообщений с поддержкой остановки
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || baseChatState.isLoading) return

    const userMessage: ChatMessage = {
      id: nanoid(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    baseChatState.addMessage(userMessage)
    
    // Устанавливаем состояние загрузки и возможности остановки
    baseChatState.setLoadingState(true)
    baseChatState.setStoppableState(true)

    // Создаем AbortController для этого запроса и сохраняем его
    const abortController = new AbortController()
    baseChatState.setAbortController(abortController)

    try {
      // Используем LangChain агент для обработки сообщений
      if (!objectChatServiceRef.current) {
        throw new Error('Object chat service not initialized')
      }
      
      const langChainResponse = await objectChatServiceRef.current.chat(
        [...baseChatState.messages, userMessage],
        abortController.signal
      )

      // Проверяем, не был ли запрос отменен
      if (!abortController.signal.aborted) {
        const assistantMessage: ChatMessage = {
          id: nanoid(),
          role: 'assistant',
          content: langChainResponse.message,
          timestamp: new Date()
        }
        baseChatState.addMessage(assistantMessage)
      }

    } catch (error) {
      // Не показываем ошибку, если запрос был отменен пользователем
      if (error instanceof Error && error.message === 'Request aborted') {
        return
      }
      
      console.error('ObjectEditor chat error:', error)
      const errorMessage: ChatMessage = {
        id: nanoid(),
        role: 'assistant',
        content: `Произошла ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        timestamp: new Date()
      }
      baseChatState.addMessage(errorMessage)
    } finally {
      // Сбрасываем состояния только если запрос не был отменен
      if (!abortController.signal.aborted) {
        baseChatState.setLoadingState(false)
        baseChatState.setStoppableState(false)
        baseChatState.setAbortController(null)
      }
    }
  }, [baseChatState])


  // Инициализация LangChain сервиса при монтировании (идемпотентно, синглтон)
  useEffect(() => {
    const initializeService = async () => {
      try {
        // Получаем синглтон экземпляр для object editor
        objectChatServiceRef.current = getOrCreateLangChainChatService(
          'object-editor',
          systemPrompt,
          { autoLoadToolsFromRegistry: false }
        )
        // Идемпотентная инициализация внутри сервиса, StrictMode-дупликаты игнорируются
        await objectChatServiceRef.current.initialize()

        // Регистрируем инструменты ObjectEditor только если их ещё нет
        const existing = new Set(objectChatServiceRef.current.getRegisteredTools())
        const objectEditorTools = createObjectEditorTools()
        let registeredNow = 0
        objectEditorTools.forEach(tool => {
          if (!existing.has(tool.name)) {
            objectChatServiceRef.current!.registerDynamicTool(tool)
            registeredNow += 1
          }
        })
        const toolNameArray: string[] = []
        objectEditorTools.forEach(tool => {
          toolNameArray.push(tool.name)
        })

        if (registeredNow > 0) {
          console.log('ObjectEditor LangChain сервис инициализирован с', toolNameArray, ' инструментами')
        }
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
    sendMessage, // Переопределенный sendMessage
    objectInfo,
    isCompactMode: mode === 'modal'
  }
}

