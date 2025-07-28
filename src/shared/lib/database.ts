import Dexie, {type Table } from 'dexie'
import { v4 as uuidv4 } from 'uuid'
import type {OpenAISettingsConnection} from './openAISettings'
import type {SceneData} from "@/entities/scene/types.ts";
import type {GfxObject} from "@/entities/object";
import type {ConnectionRecord, ObjectRecord, SceneRecord} from '../api';

export interface ScriptRecord {
  id?: number
  uuid: string
  name: string
  description?: string
  content: string
  createdAt: Date
  updatedAt: Date
}


// Database class
export class SceneLibraryDB extends Dexie {
  scenes!: Table<SceneRecord>
  objects!: Table<ObjectRecord>
  connections!: Table<ConnectionRecord>
  scripts!: Table<ScriptRecord>

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

    this.version(3).stores({
      scenes: '++id, uuid, name, createdAt, updatedAt',
      objects: '++id, uuid, name, createdAt, updatedAt',
      connections: '++id, connectionId, name, createdAt, updatedAt, isActive'
    })

    this.version(4).stores({
      scenes: '++id, uuid, name, createdAt, updatedAt',
      objects: '++id, uuid, name, createdAt, updatedAt',
      connections: '++id, connectionId, name, createdAt, updatedAt, isActive',
      scripts: '++id, uuid, name, createdAt, updatedAt'
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

  /**
   * Сохраняет новое подключение к провайдеру LLM.
   * Все новые подключения создаются неактивными.
   */
  async saveConnection(connection: OpenAISettingsConnection): Promise<void> {
    const now = new Date()

    await this.connections.put({
      connectionId: connection.id,
      name: connection.name,
      provider: connection.provider,
      url: connection.url,
      model: connection.model,
      apiKey: connection.apiKey,
      isActive: 0,
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

  // Active connection helpers
  /**
   * Возвращает идентификатор активного подключения.
   */
  async getActiveConnectionId(): Promise<string | undefined> {
    const record = await this.connections.where('isActive').equals(1).first()
    return record?.connectionId
  }

  /**
   * Делает выбранное подключение активным и снимает флаг со всех остальных.
   */
  async setActiveConnectionId(connectionId: string): Promise<void> {
    await this.transaction('rw', this.connections, async () => {
      await this.connections.toCollection().modify({ isActive: 0 })
      await this.connections
        .where('connectionId')
        .equals(connectionId)
        .modify({ isActive: 1 })
    })
  }

  // Script methods
  async saveScript(name: string, content: string, description?: string): Promise<string> {
    if (!name.trim()) {
      const error = new Error('Script name is required')
      error.name = 'ValidationError'
      throw error
    }

    const existing = await this.scripts.where('name').equals(name).first()
    if (existing) {
      const error = new Error('Script name must be unique')
      error.name = 'DuplicateNameError'
      throw error
    }

    const uuid = uuidv4()
    const now = new Date()

    try {
      await this.scripts.add({
        uuid,
        name,
        description,
        content,
        createdAt: now,
        updatedAt: now
      })
    } catch (e) {
      console.error('Error saving script to DB', e)
      throw e
    }

    return uuid
  }

  async updateScript(uuid: string, updates: Partial<Pick<ScriptRecord, 'name' | 'description' | 'content'>>): Promise<void> {
    if (updates.name) {
      const existing = await this.scripts.where('name').equals(updates.name).first()
      if (existing && existing.uuid !== uuid) {
        const error = new Error('Script name must be unique')
        error.name = 'DuplicateNameError'
        throw error
      }
    }

    try {
      await this.scripts.where('uuid').equals(uuid).modify({
        ...updates,
        updatedAt: new Date()
      })
    } catch (e) {
      console.error('Error updating script in DB', e)
      throw e
    }
  }

  async getScript(uuid: string): Promise<ScriptRecord | undefined> {
    return this.scripts.where('uuid').equals(uuid).first()
  }

  async getAllScripts(): Promise<ScriptRecord[]> {
    return this.scripts.orderBy('updatedAt').reverse().toArray()
  }

  async deleteScript(uuid: string): Promise<void> {
    await this.scripts.where('uuid').equals(uuid).delete()
  }
}

// Export singleton instance
export const db = new SceneLibraryDB()
