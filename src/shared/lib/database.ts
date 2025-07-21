import Dexie, {type Table } from 'dexie'
import { v4 as uuidv4 } from 'uuid'
import type {OpenAISettingsConnection} from './openAISettings'
import type {SceneData} from "@/entities/scene/types.ts";
import type {GfxObject} from "@/entities/object";

// Re-export types from new shared/api location for backward compatibility
export type {
  BaseDbRecord,
  SceneRecord,
  ObjectRecord,
  ConnectionRecord,
  SettingsRecord
} from '@/shared/api/types'

// Database class
export class SceneLibraryDB extends Dexie {
  scenes!: Table<SceneRecord>
  objects!: Table<ObjectRecord>
  connections!: Table<ConnectionRecord>
  settings!: Table<SettingsRecord>

  constructor() {
    super('SceneLibraryDB')

    this.version(1).stores({
      scenes: '++id, uuid, name, createdAt, updatedAt',
      objects: '++id, uuid, name, createdAt, updatedAt',
    })

    this.version(2).stores({
      scenes: '++id, uuid, name, createdAt, updatedAt',
      objects: '++id, uuid, name, createdAt, updatedAt',
      connections: '++id, connectionId, name, createdAt, updatedAt',
      settings: '++id, key, updatedAt'
    })
  }

  // Scene methods
  async saveScene(name: string, sceneData: SceneData, description?: string, thumbnail?: string): Promise<string> {
    const uuid = uuidv4()
    const now = new Date()

    await this.scenes.add({
      uuid,
      name,
      description,
      thumbnail,
      sceneData,
      createdAt: now,
      updatedAt: now
    })

    return uuid
  }

  async updateScene(uuid: string, name: string, sceneData: SceneData, description?: string, thumbnail?: string): Promise<void> {
    await this.scenes.where('uuid').equals(uuid).modify({
      name,
      description,
      thumbnail,
      sceneData,
      updatedAt: new Date()
    })
  }

  async getScene(uuid: string): Promise<SceneRecord | undefined> {
    return this.scenes.where('uuid').equals(uuid).first();
  }

  async getAllScenes(): Promise<SceneRecord[]> {
    return this.scenes.orderBy('updatedAt').reverse().toArray();
  }

  async deleteScene(uuid: string): Promise<void> {
    await this.scenes.where('uuid').equals(uuid).delete()
  }

  async saveObject(
    name: string,
    objectData: GfxObject,
    description?: string,
    thumbnail?: string
  ): Promise<string> {
    if (!name.trim()) {
      const error = new Error('Name is required')
      error.name = 'ValidationError'
      throw error
    }

    const existing = await this.objects.where('name').equals(name).first()
    if (existing) {
      const error = new Error('Object name must be unique')
      error.name = 'DuplicateNameError'
      throw error
    }

    const uuid = uuidv4()
    const now = new Date()

    try {
      await this.objects.add({
        uuid,
        name,
        description,
        thumbnail,
        objectData,
        createdAt: now,
        updatedAt: now
      })
    } catch (e) {
      console.error('Error saving object to DB', e)
      throw e
    }

    return uuid
  }

  async updateObject(
    uuid: string,
    updates: Partial<ObjectRecord>
  ): Promise<void> {
    if (updates.name) {
      const existing = await this.objects.where('name').equals(updates.name).first()
      if (existing && existing.uuid !== uuid) {
        const error = new Error('Object name must be unique')
        error.name = 'DuplicateNameError'
        throw error
      }
    }

    try {
      await this.objects.where('uuid').equals(uuid).modify({
        ...updates,
        updatedAt: new Date()
      })
    } catch (e) {
      console.error('Error updating object in DB', e)
      throw e
    }
  }

  async getObject(uuid: string): Promise<ObjectRecord | undefined> {
    return this.objects.where('uuid').equals(uuid).first();
  }

  async getAllObjects(): Promise<ObjectRecord[]> {
    return this.objects.orderBy('updatedAt').reverse().toArray();
  }

  async deleteObject(uuid: string): Promise<void> {
    await this.objects.where('uuid').equals(uuid).delete()
  }


  // Connection methods
  async saveConnection(connection: OpenAISettingsConnection): Promise<void> {
    const now = new Date()

    await this.connections.put({
      connectionId: connection.id,
      name: connection.name,
      provider: connection.provider,
      url: connection.url,
      model: connection.model,
      apiKey: connection.apiKey,
      createdAt: now,
      updatedAt: now
    })
  }

  async getAllConnections(): Promise<OpenAISettingsConnection[]> {
    const records = await this.connections.orderBy('updatedAt').reverse().toArray()
    return records.map(record => ({
      id: record.connectionId,
      name: record.name,
      provider: record.provider as OpenAISettingsConnection['provider'],
      url: record.url,
      model: record.model,
      apiKey: record.apiKey
    }))
  }

  async getConnection(connectionId: string): Promise<OpenAISettingsConnection | undefined> {
    const record = await this.connections.where('connectionId').equals(connectionId).first()
    if (!record) return undefined

    return {
      id: record.connectionId,
      name: record.name,
      provider: record.provider as OpenAISettingsConnection['provider'],
      url: record.url,
      model: record.model,
      apiKey: record.apiKey
    }
  }

  async deleteConnection(connectionId: string): Promise<void> {
    await this.connections.where('connectionId').equals(connectionId).delete()
  }

  async updateConnection(connection: OpenAISettingsConnection): Promise<void> {
    await this.connections.where('connectionId').equals(connection.id).modify({
      name: connection.name,
      provider: connection.provider,
      url: connection.url,
      model: connection.model,
      apiKey: connection.apiKey,
      updatedAt: new Date()
    })
  }

  // Settings methods
  async setSetting(key: string, value: string): Promise<void> {
    await this.settings.put({
      key,
      value,
      updatedAt: new Date()
    })
  }

  async getSetting(key: string): Promise<string | undefined> {
    const record = await this.settings.where('key').equals(key).first()
    return record?.value
  }

  async getActiveConnectionId(): Promise<string | undefined> {
    return await this.getSetting('activeConnectionId')
  }

  async setActiveConnectionId(connectionId: string): Promise<void> {
    await this.setSetting('activeConnectionId', connectionId)
  }
}

// Export singleton instance
export const db = new SceneLibraryDB()
