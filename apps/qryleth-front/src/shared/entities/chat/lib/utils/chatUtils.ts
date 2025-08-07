import type { ChatMessage, ToolCall } from '../../types'

/**
 * Утилиты для работы с чатом
 */

/**
 * Создает новое сообщение с автоматически сгенерированным ID
 */
export const createChatMessage = (
  content: string,
  role: ChatMessage['role'],
  options: {
    toolCalls?: ToolCall[]
    metadata?: Record<string, any>
    timestamp?: Date
    id?: string
  } = {}
): ChatMessage => {
  return {
    id: options.id || crypto.randomUUID(),
    content,
    role,
    timestamp: options.timestamp || new Date(),
    toolCalls: options.toolCalls,
    metadata: options.metadata
  }
}

/**
 * Проверяет, есть ли в сообщении tool calls
 */
export const hasToolCalls = (message: ChatMessage): boolean => {
  return Boolean(message.toolCalls && message.toolCalls.length > 0)
}

/**
 * Фильтрует сообщения по роли
 */
export const filterMessagesByRole = (
  messages: ChatMessage[],
  role: ChatMessage['role']
): ChatMessage[] => {
  return messages.filter(message => message.role === role)
}

/**
 * Получает последнее сообщение указанной роли
 */
export const getLastMessageByRole = (
  messages: ChatMessage[],
  role: ChatMessage['role']
): ChatMessage | undefined => {
  const filtered = filterMessagesByRole(messages, role)
  return filtered[filtered.length - 1]
}

/**
 * Конвертирует старый формат ChatMessage в новый
 */
export const convertLegacyChatMessage = (
  legacyMessage: {
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
  }
): ChatMessage => {
  return createChatMessage(
    legacyMessage.content,
    legacyMessage.role,
    { timestamp: legacyMessage.timestamp }
  )
}

/**
 * Конвертирует новый формат ChatMessage в старый (для обратной совместимости)
 */
export const convertToLegacyChatMessage = (
  message: ChatMessage
): {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
} => {
  return {
    role: message.role,
    content: message.content,
    timestamp: message.timestamp
  }
}