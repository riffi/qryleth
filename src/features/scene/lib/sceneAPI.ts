/**
 * Scene API для доступа AI агентов к данным и операциям со сценой
 * Предоставляет публичный интерфейс для взаимодействия с Zustand store
 */

import { useSceneStore } from '@/features/scene/model/sceneStore'
import { generateUUID } from '@/shared/lib/uuid'
import type { SceneObject, SceneObjectInstance, SceneData } from '@/entities/scene/types'
import type { Transform } from '@/shared/types/transform'
import type { GfxPrimitive } from '@/entities'

/**
 * Simplified scene object info for agent tools
 */
export interface SceneObjectInfo {
  uuid: string
  name: string
  layerId?: string
  visible?: boolean
  primitiveCount: number
  primitiveTypes: string[]
  hasInstances: boolean
  instanceCount: number
}

/**
 * Simplified scene instance info for agent tools
 */
export interface SceneInstanceInfo {
  uuid: string
  objectUuid: string
  objectName: string
  transform?: Transform
  visible?: boolean
}

/**
 * Scene overview for agent tools
 */
export interface SceneOverview {
  totalObjects: number
  totalInstances: number
  objects: SceneObjectInfo[]
  instances: SceneInstanceInfo[]
  sceneName: string
  layers: Array<{
    id: string
    name: string
    visible: boolean
    objectCount: number
  }>
}

/**
 * Result of adding object instance operation
 */
export interface AddInstanceResult {
  success: boolean
  instanceUuid?: string
  objectUuid?: string
  error?: string
}

/**
 * Scene API class для предоставления методов агентам
 */
export class SceneAPI {
  /**
   * Получить обзор текущей сцены с информацией об объектах и экземплярах
   */
  static getSceneOverview(): SceneOverview {
    const state = useSceneStore.getState()
    const { objects, objectInstances, sceneMetaData, layers } = state

    // Создать информацию об объектах
    const objectsInfo: SceneObjectInfo[] = objects.map(obj => {
      const instances = objectInstances.filter(inst => inst.objectUuid === obj.uuid)
      return {
        uuid: obj.uuid,
        name: obj.name,
        layerId: obj.layerId,
        visible: obj.visible,
        primitiveCount: obj.primitives.length,
        primitiveTypes: [...new Set(obj.primitives.map(p => p.type))],
        hasInstances: instances.length > 0,
        instanceCount: instances.length
      }
    })

    // Создать информацию об экземплярах
    const instancesInfo: SceneInstanceInfo[] = objectInstances.map(inst => {
      const object = objects.find(obj => obj.uuid === inst.objectUuid)
      return {
        uuid: inst.uuid,
        objectUuid: inst.objectUuid,
        objectName: object?.name || 'Unknown Object',
        transform: inst.transform,
        visible: inst.visible
      }
    })

    // Создать информацию о слоях
    const layersInfo = layers.map(layer => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      objectCount: objects.filter(obj => obj.layerId === layer.id).length
    }))

    return {
      totalObjects: objects.length,
      totalInstances: objectInstances.length,
      objects: objectsInfo,
      instances: instancesInfo,
      sceneName: sceneMetaData.name,
      layers: layersInfo
    }
  }

  /**
   * Получить список всех объектов сцены
   */
  static getSceneObjects(): SceneObjectInfo[] {
    return this.getSceneOverview().objects
  }

  /**
   * Получить список всех экземпляров объектов
   */
  static getSceneInstances(): SceneInstanceInfo[] {
    return this.getSceneOverview().instances
  }

  /**
   * Найти объект по UUID
   */
  static findObjectByUuid(uuid: string): SceneObject | null {
    const state = useSceneStore.getState()
    return state.objects.find(obj => obj.uuid === uuid) || null
  }

  /**
   * Найти объект по имени (первый найденный)
   */
  static findObjectByName(name: string): SceneObject | null {
    const state = useSceneStore.getState()
    return state.objects.find(obj => obj.name.toLowerCase().includes(name.toLowerCase())) || null
  }

  /**
   * Добавить экземпляр существующего объекта на сцену
   */
  static addObjectInstance(
    objectUuid: string, 
    position: [number, number, number] = [0, 0, 0],
    rotation: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] = [1, 1, 1],
    visible: boolean = true
  ): AddInstanceResult {
    try {
      const state = useSceneStore.getState()
      
      // Проверить существование объекта
      const existingObject = state.objects.find(obj => obj.uuid === objectUuid)
      if (!existingObject) {
        return {
          success: false,
          error: `Object with UUID ${objectUuid} not found in scene`
        }
      }

      // Создать новый экземпляр
      const newInstance: SceneObjectInstance = {
        uuid: generateUUID(),
        objectUuid: objectUuid,
        transform: {
          position,
          rotation,
          scale
        },
        visible
      }

      // Добавить экземпляр в store
      state.addObjectInstance(newInstance)

      return {
        success: true,
        instanceUuid: newInstance.uuid,
        objectUuid: objectUuid
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to add object instance: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Получить доступные слои для размещения объектов
   */
  static getAvailableLayers() {
    const state = useSceneStore.getState()
    return state.layers.map(layer => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      position: layer.position
    }))
  }

  /**
   * Проверить можно ли добавить экземпляр объекта
   */
  static canAddInstance(objectUuid: string): boolean {
    const state = useSceneStore.getState()
    return state.objects.some(obj => obj.uuid === objectUuid)
  }

  /**
   * Получить статистику сцены
   */
  static getSceneStats() {
    const overview = this.getSceneOverview()
    const visibleObjects = overview.objects.filter(obj => obj.visible !== false).length
    const visibleInstances = overview.instances.filter(inst => inst.visible !== false).length
    const visibleLayers = overview.layers.filter(layer => layer.visible).length

    return {
      total: {
        objects: overview.totalObjects,
        instances: overview.totalInstances,
        layers: overview.layers.length
      },
      visible: {
        objects: visibleObjects,
        instances: visibleInstances,
        layers: visibleLayers
      },
      primitiveTypes: [...new Set(
        overview.objects.flatMap(obj => obj.primitiveTypes)
      )]
    }
  }
}