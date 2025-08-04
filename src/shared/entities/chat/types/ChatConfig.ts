/**
 * Конфигурация чата для различных фич
 */

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, any>
}

export interface ChatConfig {
  feature: 'scene' | 'object-editor'
  tools: ToolDefinition[]
  systemPrompt: string
  debugMode?: boolean
  maxMessages?: number
  autoScroll?: boolean
}