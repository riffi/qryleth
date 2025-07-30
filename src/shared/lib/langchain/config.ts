import {ChatOpenAI} from '@langchain/openai'
import type {LangChainConfig} from './types'
import {getLangChainBaseUrl} from '../openAISettings'

/**
 * Creates a LangChain ChatOpenAI instance from our connection settings
 */
export function createChatModel(config: LangChainConfig): ChatOpenAI {
  const { connection, temperature = 0.7, maxTokens = 4000 } = config

  // Validate connection has required fields
  if (!connection) {
    throw new Error('Connection is required for LangChain chat model')
  }

  if (!connection.apiKey || connection.apiKey.trim() === '') {
    throw new Error(
      `API ключ не настроен для подключения "${connection.name}". ` +
      'Пожалуйста, настройте API ключ в настройках подключений.'
    )
  }

  if (!connection.model || connection.model.trim() === '') {
    throw new Error(
      `Модель не выбрана для подключения "${connection.name}". ` +
      'Пожалуйста, выберите модель в настройках подключений.'
    )
  }

  try {
    return new ChatOpenAI({
      model: connection.model,
      temperature,
      maxTokens,
      streaming: false,
      disableStreaming: true,
      apiKey: connection.apiKey,
      configuration: {
        apiKey: connection.apiKey,
        baseURL: getLangChainBaseUrl(connection),
      },
    })
  } catch (error) {
    throw new Error(
      `Ошибка создания LangChain модели: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}. ` +
      'Проверьте настройки подключения.'
    )
  }
}

/**
 * Default configuration for LangChain chat
 */
export const DEFAULT_LANGCHAIN_CONFIG = {
  temperature: 0.7,
  maxTokens: 4000,
}
