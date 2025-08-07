import type {ChatMessage} from '@/shared/entities/chat'
import type {LangChainChatResponse} from './types'
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from '@langchain/core/messages'


/**
 * Converts ChatMessage array to LangChain BaseMessage array
 */
export function adaptMessagesToLangChain(messages: ChatMessage[]): BaseMessage[] {
  return messages.map(message => {
    switch (message.role) {
      case 'user':
        return new HumanMessage(message.content)
      case 'assistant':
        return new AIMessage(message.content)
      case 'system':
        return new SystemMessage(message.content)
      default:
        throw new Error(`Unknown message role: ${message.role}`)
    }
  })
}

/**
 * Converts LangChain response back to our format
 */
export function adaptLangChainResponse(response: any): LangChainChatResponse {
  const content = response.content || ''

  // Check for tool calls in the response
  if (response.tool_calls && response.tool_calls.length > 0) {
    return {
      message: content,
      toolCalls: response.tool_calls.map((call: any) => ({
        id: call.id || `call_${Date.now()}`,
        name: call.name,
        args: call.args || {},
      })),
      finishReason: 'tool_calls',
    }
  }

  return {
    message: content,
    finishReason: 'stop',
  }
}
