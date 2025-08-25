import { useState, useCallback, useRef } from 'react'
import type { ChatMessage, ChatConfig } from '../../types'

interface UseChatWithStopReturn {
  messages: ChatMessage[]
  isLoading: boolean
  isStoppable: boolean
  sendMessage: (content: string) => Promise<void>
  stopExecution: () => void
  addMessage: (message: ChatMessage) => void
  clearMessages: () => void
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  // Методы для управления состоянием из переопределённых функций
  setLoadingState: (loading: boolean) => void
  setStoppableState: (stoppable: boolean) => void
  getAbortController: () => AbortController | null
  setAbortController: (controller: AbortController | null) => void
}

interface UseChatWithStopOptions {
  config?: ChatConfig
  onMessage?: (message: ChatMessage) => void
  generateMessageId?: () => string
  onExecutionStart?: () => void
  onExecutionStop?: () => void
  onExecutionComplete?: () => void
}

/**
 * Расширенная версия useChat с поддержкой принудительной остановки выполнения агента.
 * Предоставляет контроль над процессом выполнения запросов и возможность их прерывания.
 */
export const useChatWithStop = (options: UseChatWithStopOptions = {}): UseChatWithStopReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStoppable, setIsStoppable] = useState(false)
  
  // AbortController для отмены запросов
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const { 
    onMessage, 
    generateMessageId = () => crypto.randomUUID(),
    onExecutionStart,
    onExecutionStop,
    onExecutionComplete
  } = options

  /**
   * Добавляет сообщение в чат и вызывает callback.
   */
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message])
    onMessage?.(message)
  }, [onMessage])

  /**
   * Принудительно останавливает выполнение текущего запроса.
   * Отменяет HTTP-запрос через AbortController и сбрасывает состояние загрузки.
   */
  const stopExecution = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    setIsLoading(false)
    setIsStoppable(false)
    
    // Добавляем сообщение об остановке
    const stopMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: '⏹️ Выполнение остановлено пользователем',
      timestamp: new Date()
    }
    addMessage(stopMessage)
    
    onExecutionStop?.()
  }, [generateMessageId, addMessage, onExecutionStop])

  /**
   * Отправляет сообщение. Базовая реализация - переопределяется в конкретных хуках.
   * Предоставляет AbortController для возможности отмены запроса.
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    addMessage(userMessage)
    setIsLoading(true)
    setIsStoppable(true)
    
    // Создаем новый AbortController для этого запроса
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    onExecutionStart?.()

    try {
      // Базовая реализация - должна быть переопределена
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(resolve, 1000)
        
        abortController.signal.addEventListener('abort', () => {
          clearTimeout(timeoutId)
          reject(new Error('Request aborted'))
        })
      })
      
      if (!abortController.signal.aborted) {
        const assistantMessage: ChatMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content: 'Это базовая реализация чата с поддержкой остановки. Переопределите sendMessage для интеграции с вашим сервисом.',
          timestamp: new Date()
        }
        
        addMessage(assistantMessage)
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        const errorMessage: ChatMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content: `Произошла ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
          timestamp: new Date()
        }
        addMessage(errorMessage)
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false)
        setIsStoppable(false)
        abortControllerRef.current = null
        onExecutionComplete?.()
      }
    }
  }, [isLoading, addMessage, generateMessageId, onExecutionStart, onExecutionComplete])

  /**
   * Очищает все сообщения в чате.
   */
  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  /**
   * Методы для управления состоянием из переопределённых sendMessage функций
   */
  const setLoadingState = useCallback((loading: boolean) => {
    setIsLoading(loading)
  }, [])

  const setStoppableState = useCallback((stoppable: boolean) => {
    setIsStoppable(stoppable)
  }, [])

  const getAbortController = useCallback(() => {
    return abortControllerRef.current
  }, [])

  const setAbortController = useCallback((controller: AbortController | null) => {
    abortControllerRef.current = controller
  }, [])

  return {
    messages,
    isLoading,
    isStoppable,
    sendMessage,
    stopExecution,
    addMessage,
    clearMessages,
    setMessages,
    setLoadingState,
    setStoppableState,
    getAbortController,
    setAbortController
  }
}