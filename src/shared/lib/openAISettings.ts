import { db } from './database'

export type LLMProvider = 'openrouter' | 'openai' | 'compatible' | 'moonshot'

export interface OpenAISettingsConnection {
  id: string;
  name: string;
  provider: LLMProvider;
  url: string;
  model: string;
  apiKey: string;
}

/**
 * Предустановленные модели для каждого провайдера LLM
 */
export const PREDEFINED_MODELS: Record<LLMProvider, string[]> = {
  openrouter: [
    'deepseek/deepseek-chat-v3-0324:free',
    'google/gemma-3-12b-it:free',
    'moonshotai/kimi-k2:free',
  ],
  openai: ['gpt-4o', 'gpt-3.5-turbo'],
  compatible: [],
  moonshot: ['kimi-k2-0711-preview'],
}

/**
 * Возвращает список моделей, доступных для указанного провайдера
 */
export function getProviderModels(provider: LLMProvider): string[] {
  return PREDEFINED_MODELS[provider] ?? []
}

/**
 * Создаёт стандартное подключение к LLM
 */
function getDefaultConnection(): OpenAISettingsConnection {
  return {
    id: 'default',
    name: 'Default',
    provider: 'openrouter',
    url: 'https://openrouter.ai/api/v1',
    model: PREDEFINED_MODELS.openrouter[0],
    apiKey: ''
  }
}



export async function getAllConnections(): Promise<{ connections: OpenAISettingsConnection[]; activeId?: string }> {

  const connections = await db.getAllConnections();
  const activeId = await db.getActiveConnectionId();

  return { connections, activeId };
}

export async function saveConnections(connections: OpenAISettingsConnection[], activeId?: string): Promise<void> {
  // Save all connections
  for (const connection of connections) {
    await db.saveConnection(connection);
  }

  // Set active connection
  if (activeId) {
    await db.setActiveConnectionId(activeId);
  }
}

export async function setActiveConnection(id: string): Promise<void> {
  await db.setActiveConnectionId(id);
}

export async function getActiveConnection(): Promise<OpenAISettingsConnection> {

  const activeId = await db.getActiveConnectionId();

  if (activeId) {
    const connection = await db.getConnection(activeId);
    if (connection) {
      return connection;
    }
  }

  // Fallback to first connection
  const connections = await db.getAllConnections();
  return connections[0] || getDefaultConnection();
}

export async function upsertConnection(connection: OpenAISettingsConnection): Promise<void> {
  const existing = await db.getConnection(connection.id);

  if (existing) {
    await db.updateConnection(connection);
  } else {
    await db.saveConnection(connection);
  }
}

export async function removeConnection(id: string): Promise<void> {
  await db.deleteConnection(id);

  // If this was the active connection, set a new active connection
  const activeId = await db.getActiveConnectionId();
  if (activeId === id) {
    const connections = await db.getAllConnections();
    if (connections.length > 0) {
      await db.setActiveConnectionId(connections[0].id);
    }
  }
}


/**
 * Gets the base URL for LangChain from connection URL
 */
export function getLangChainBaseUrl(connection: OpenAISettingsConnection): string {
  let baseUrl = connection.url

  // Remove common API endpoints to get base URL
  baseUrl = baseUrl.replace('/chat/completions', '')
  baseUrl = baseUrl.replace('/v1', '')

  // Ensure it ends with /v1 for LangChain
  if (!baseUrl.endsWith('/v1')) {
    baseUrl = baseUrl + '/v1'
  }

  return baseUrl
}
