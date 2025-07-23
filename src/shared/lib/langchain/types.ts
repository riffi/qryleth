import type {ChatMessage} from '../openAIAPI'
import type {OpenAISettingsConnection} from '../openAISettings'

/**
 * LangChain-compatible tool definition
 */
export interface LangChainTool {
  name: string
  description: string
  schema: Record<string, any>
}

/**
 * LangChain chat configuration
 */
export interface LangChainConfig {
  connection: OpenAISettingsConnection
  temperature?: number
  maxTokens?: number
  model?: string
}

/**
 * LangChain chat response
 */
export interface LangChainChatResponse {
  message: string
  toolCalls?: Array<{
    id: string
    name: string
    args: Record<string, any>
  }>
  finishReason: 'stop' | 'tool_calls' | 'length'
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  success: boolean
  result?: any
  error?: string
}

/**
 * Chat session state
 */
export interface ChatSession {
  messages: ChatMessage[]
  tools: LangChainTool[]
}
