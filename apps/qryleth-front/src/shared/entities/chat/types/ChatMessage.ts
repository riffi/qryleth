/**
 * Типы сообщений чата для Feature-Sliced Design архитектуры
 */

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, any>
  result?: any
}

export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: Date
  toolCalls?: ToolCall[]
  metadata?: Record<string, any>
}