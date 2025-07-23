import { ChatOpenAI } from '@langchain/openai'
import type {LangChainConfig} from './types'
import { getLangChainBaseUrl } from '../openAISettings'

/**
 * Creates a LangChain ChatOpenAI instance from our connection settings
 */
export function createChatModel(config: LangChainConfig): ChatOpenAI {
  const { connection, temperature = 0.7, maxTokens = 4000 } = config

  const chatModel = new ChatOpenAI({
    model: connection.model,
    temperature,
    maxTokens,
    openAIApiKey: connection.apiKey,
    configuration: {
      baseURL: getLangChainBaseUrl(connection),
    },
  })

  return chatModel
}

/**
 * Default configuration for LangChain chat
 */
export const DEFAULT_LANGCHAIN_CONFIG = {
  temperature: 0.7,
  maxTokens: 4000,
}
