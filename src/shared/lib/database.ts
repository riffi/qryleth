import Dexie, {type Table } from 'dexie'
import { v4 as uuidv4 } from 'uuid'
import type {BaseObject, Vector3, Transform, SceneData, GfxObject} from '../types/common'
import type {OpenAISettingsConnection} from './openAISettings'

// Database interfaces
export interface SceneRecord extends BaseObject {
  id?: number
  sceneData: SceneData
}

export interface ObjectRecord extends BaseObject {
  id?: number
  objectData: GfxObject
  layerId?: string
}

export interface SceneObjectRelation extends Transform {
  id?: number
  sceneUuid: string
  objectUuid: string
  createdAt: Date
}

export interface ConnectionRecord {
  id?: number
  connectionId: string
  name: string
  provider: string
  url: string
  model: string
  apiKey: string
  createdAt: Date
  updatedAt: Date
}

export interface SettingsRecord {
  id?: number
  key: string
  value: string
  updatedAt: Date
}

// Database class
export class SceneLibraryDB extends Dexie {
  scenes!: Table<SceneRecord>
  objects!: Table<ObjectRecord>
  sceneObjects!: Table<SceneObjectRelation>
  connections!: Table<ConnectionRecord>
  settings!: Table<SettingsRecord>

  constructor() {
    super('SceneLibraryDB')
    
    this.version(1).stores({
      scenes: '++id, uuid, name, createdAt, updatedAt',
      objects: '++id, uuid, name, createdAt, updatedAt',
      sceneObjects: '++id, sceneUuid, objectUuid, createdAt'
    })
    
    this.version(2).stores({
      scenes: '++id, uuid, name, createdAt, updatedAt',
      objects: '++id, uuid, name, createdAt, updatedAt',
      sceneObjects: '++id, sceneUuid, objectUuid, createdAt',
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
    return await this.scenes.where('uuid').equals(uuid).first()
  }

  async getAllScenes(): Promise<SceneRecord[]> {
    return await this.scenes.orderBy('updatedAt').reverse().toArray()
  }

  async deleteScene(uuid: string): Promise<void> {
    await this.scenes.where('uuid').equals(uuid).delete()
    // Also delete related scene-object relations
    await this.sceneObjects.where('sceneUuid').equals(uuid).delete()
  }

  // Object methods
  async saveObject(name: string, objectData: GfxObject, description?: string, thumbnail?: string, layerId?: string): Promise<string> {
    const uuid = uuidv4()
    const now = new Date()
    
    await this.objects.add({
      uuid,
      name,
      description,
      thumbnail,
      objectData,
      layerId,
      createdAt: now,
      updatedAt: now
    })
    
    return uuid
  }

  async getObject(uuid: string): Promise<ObjectRecord | undefined> {
    return await this.objects.where('uuid').equals(uuid).first()
  }

  async getAllObjects(): Promise<ObjectRecord[]> {
    return await this.objects.orderBy('updatedAt').reverse().toArray()
  }

  async deleteObject(uuid: string): Promise<void> {
    await this.objects.where('uuid').equals(uuid).delete()
    // Also delete related scene-object relations
    await this.sceneObjects.where('objectUuid').equals(uuid).delete()
  }

  async updateObject(uuid: string, name: string, objectData: GfxObject, description?: string, thumbnail?: string, layerId?: string): Promise<void> {
    await this.objects.where('uuid').equals(uuid).modify({
      name,
      description,
      thumbnail,
      objectData,
      layerId,
      updatedAt: new Date()
    })
  }

  // Scene-Object relation methods
  async addObjectToScene(sceneUuid: string, objectUuid: string, position: Vector3, rotation: Vector3, scale: Vector3): Promise<void> {
    await this.sceneObjects.add({
      sceneUuid,
      objectUuid,
      position,
      rotation,
      scale,
      createdAt: new Date()
    })
  }

  async getSceneObjects(sceneUuid: string): Promise<SceneObjectRelation[]> {
    return await this.sceneObjects.where('sceneUuid').equals(sceneUuid).toArray()
  }

  // Layer methods
  async updateObjectLayer(uuid: string, layerId: string): Promise<void> {
    await this.objects.where('uuid').equals(uuid).modify({
      layerId,
      updatedAt: new Date()
    })
  }

  async getObjectsByLayer(layerId: string): Promise<ObjectRecord[]> {
    return await this.objects.where('layerId').equals(layerId).toArray()
  }

  async getObjectsWithoutLayer(): Promise<ObjectRecord[]> {
    return await this.objects.where('layerId').equals('').toArray()
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
