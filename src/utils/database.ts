import Dexie, {type Table } from 'dexie'
import { v4 as uuidv4 } from 'uuid'
import type {BaseObject, Vector3, Transform} from '../types/common'

// Database interfaces
export interface SceneRecord extends BaseObject {
  id?: number
  sceneData: any // JSON data of the scene
}

export interface ObjectRecord extends BaseObject {
  id?: number
  objectData: any // JSON data of the object
}

export interface SceneObjectRelation extends Transform {
  id?: number
  sceneUuid: string
  objectUuid: string
  createdAt: Date
}

// Database class
export class SceneLibraryDB extends Dexie {
  scenes!: Table<SceneRecord>
  objects!: Table<ObjectRecord>
  sceneObjects!: Table<SceneObjectRelation>

  constructor() {
    super('SceneLibraryDB')
    
    this.version(1).stores({
      scenes: '++id, uuid, name, createdAt, updatedAt',
      objects: '++id, uuid, name, createdAt, updatedAt',
      sceneObjects: '++id, sceneUuid, objectUuid, createdAt'
    })
  }

  // Scene methods
  async saveScene(name: string, sceneData: any, description?: string, thumbnail?: string): Promise<string> {
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

  async updateScene(uuid: string, name: string, sceneData: any, description?: string, thumbnail?: string): Promise<void> {
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
  async saveObject(name: string, objectData: any, description?: string, thumbnail?: string): Promise<string> {
    const uuid = uuidv4()
    const now = new Date()
    
    await this.objects.add({
      uuid,
      name,
      description,
      thumbnail,
      objectData,
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
}

// Export singleton instance
export const db = new SceneLibraryDB()