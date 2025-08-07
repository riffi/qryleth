import type {ChatMessage} from '@/shared/entities/chat'
import type {OpenAISettingsConnection} from '../openAISettings'
import type { DynamicStructuredTool } from '@langchain/core/tools'

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

/**
 * Tool provider interface for features
 */
export interface ToolProvider {
  /**
   * Get tools provided by this feature
   */
  getTools(): DynamicStructuredTool[]
  
  /**
   * Feature name for identification
   */
  readonly featureName: string
}

/**
 * Tool registration event for dynamic registration
 */
export interface ToolRegistrationEvent {
  type: 'register' | 'unregister'
  provider: ToolProvider
}

/**
 * Tool registry for managing dynamic tool registration
 */
export interface ToolRegistry {
  /**
   * Register a tool provider
   */
  registerProvider(provider: ToolProvider): void
  
  /**
   * Unregister a tool provider
   */
  unregisterProvider(featureName: string): void
  
  /**
   * Get all registered tools
   */
  getAllTools(): DynamicStructuredTool[]
  
  /**
   * Get tools from specific feature
   */
  getToolsByFeature(featureName: string): DynamicStructuredTool[]
  
  /**
   * Subscribe to tool registration events
   */
  onToolsChange(callback: (event: ToolRegistrationEvent) => void): void
}
