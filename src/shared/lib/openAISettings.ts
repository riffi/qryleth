import { db } from './database'

export type LLMProvider = 'openrouter' | 'openai' | 'compatible'

export interface OpenAISettingsConnection {
  id: string;
  name: string;
  provider: LLMProvider;
  url: string;
  model: string;
  apiKey: string;
}

function getDefaultConnection(): OpenAISettingsConnection {
  return {
    id: 'default',
    name: 'Default',
    provider: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'anthropic/claude-sonnet-4',
    apiKey: ''
  }
}

// Migration function to move data from localStorage to Dexie
async function migrateFromLocalStorage(): Promise<void> {
  const STORAGE_KEY = 'openai_settings';
  const raw = localStorage.getItem(STORAGE_KEY);
  
  if (!raw) return;
  
  try {
    const parsed = JSON.parse(raw) as { connections: OpenAISettingsConnection[]; activeId?: string };
    
    if (parsed.connections && Array.isArray(parsed.connections)) {
      // Save connections to Dexie
      for (const connection of parsed.connections) {
        const normalizedConnection = {
          ...connection,
          provider: connection.provider ?? 'openrouter'
        };
        await db.saveConnection(normalizedConnection);
      }
      
      // Save active connection ID
      if (parsed.activeId) {
        await db.setActiveConnectionId(parsed.activeId);
      }
      
      // Remove from localStorage after successful migration
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error('Migration from localStorage failed:', error);
  }
}

// Initialize default connection if no connections exist
async function initializeDefaultConnection(): Promise<void> {
  const connections = await db.getAllConnections();
  if (connections.length === 0) {
    const defaultConnection = getDefaultConnection();
    await db.saveConnection(defaultConnection);
    await db.setActiveConnectionId(defaultConnection.id);
  }
}

export async function getAllConnections(): Promise<{ connections: OpenAISettingsConnection[]; activeId?: string }> {
  await migrateFromLocalStorage();
  await initializeDefaultConnection();
  
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
  await migrateFromLocalStorage();
  await initializeDefaultConnection();
  
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
