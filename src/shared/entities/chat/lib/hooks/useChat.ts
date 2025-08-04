import { useState, useCallback } from 'react'
import type { ChatMessage, ChatConfig } from '../../types'

interface UseChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  sendMessage: (content: string) => Promise<void>
  addMessage: (message: ChatMessage) => void
  clearMessages: () => void
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
}

interface UseChatOptions {
  config?: ChatConfig
  onMessage?: (message: ChatMessage) => void
  generateMessageId?: () => string
}

export const useChat = (options: UseChatOptions = {}): UseChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const { onMessage, generateMessageId = () => crypto.randomUUID() } = options

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message])
    onMessage?.(message)
  }, [onMessage])

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

    try {
      // This is a basic implementation - specific features should override this
      // with their own chat service integration
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: 'Это базовая реализация чата. Переопределите sendMessage для интеграции с вашим сервисом.',
        timestamp: new Date()
      }
      
      addMessage(assistantMessage)
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: `Произошла ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        timestamp: new Date()
      }
      addMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, addMessage, generateMessageId])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    isLoading,
    sendMessage,
    addMessage,
    clearMessages,
    setMessages
  }
}