/**
 * Scene API для доступа AI агентов к данным и операциям со сценой
 * Предоставляет публичный интерфейс для взаимодействия с Zustand store
 */

import { useSceneStore } from '@/features/scene/model/sceneStore'
import { generateUUID } from '@/shared/lib/uuid'
import type { SceneObject, SceneObjectInstance, SceneData } from '@/entities/scene/types'
import type { Transform } from '@/shared/types/transform'
import type { GFXObjectWithTransform } from '@/entities/object/model/types'
import { correctLLMGeneratedObject } from '@/features/scene/lib/correction/LLMGeneratedObjectCorrector'
import { placeInstance, adjustAllInstancesForPerlinTerrain } from '@/features/scene/lib/placement/ObjectPlacementUtils'
import type {Vector3} from "@/shared/types";

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
 * Result of adding object with transform operation
 */
export interface AddObjectWithTransformResult {
  success: boolean
  objectUuid?: string
  instanceUuid?: string
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
    position: Vector3 = [0, 0, 0],
    rotation: Vector3 = [0, 0, 0],
    scale: Vector3 = [1, 1, 1],
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

  /**
   * Добавить объект с трансформацией в сцену
   * Объединяет функциональность handleObjectAdded из SceneEditorR3F
   */
  static addObjectWithTransform(objectData: GFXObjectWithTransform): AddObjectWithTransformResult {
    try {
      const state = useSceneStore.getState()
      const { addObject, addObjectInstance, layers } = state

      // Применить коррекцию для LLM-сгенерированных объектов
      const correctedObject = correctLLMGeneratedObject(objectData)

      // Генерировать UUID для объекта
      const objectUuid = generateUUID()

      // Создать объект сцены
      const newObject: SceneObject = {
        uuid: objectUuid,
        name: correctedObject.name,
        primitives: correctedObject.primitives,
        layerId: 'objects'
      }

      // Добавить объект в store
      addObject(newObject)

      // Найти подходящий landscape слой (логика из addInstanceToScene)
      const perlinLandscape = layers.find(layer =>
        layer.type === 'landscape' && layer.shape === 'perlin'
      )
      const anyLandscape = layers.find(layer => layer.type === 'landscape')
      const landscapeLayer = perlinLandscape || anyLandscape || null

      // Создать экземпляр объекта
      const instanceUuid = generateUUID()
      const newInstance: SceneObjectInstance = {
        uuid: instanceUuid,
        objectUuid: objectUuid,
        transform: correctedObject,
        visible: true
      }

      // Разместить экземпляр с учетом ландшафта
      const placedInstance = placeInstance(newInstance, landscapeLayer)

      // Добавить экземпляр в store
      addObjectInstance(placedInstance)

      return {
        success: true,
        objectUuid: objectUuid,
        instanceUuid: instanceUuid
      }

    } catch (error) {
      return {
        success: false,
        error: `Failed to add object with transform: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Adjust all object instances for perlin noise terrain when a perlin layer is added
   */
  static adjustInstancesForPerlinTerrain(perlinLayerId: string): { success: boolean; adjustedCount?: number; error?: string } {
    try {
      const state = useSceneStore.getState()
      const { objectInstances, layers, setObjectInstances } = state

      // Find the perlin layer
      const perlinLayer = layers.find(layer =>
        layer.id === perlinLayerId &&
        layer.type === 'landscape' &&
        layer.shape === 'perlin'
      )

      if (!perlinLayer) {
        return {
          success: false,
          error: `Perlin layer with ID ${perlinLayerId} not found`
        }
      }

      // Adjust all instances
      const adjustedInstances = adjustAllInstancesForPerlinTerrain(objectInstances, perlinLayer)

      // Count how many were actually adjusted
      const adjustedCount = adjustedInstances.filter((instance, index) => {
        const original = objectInstances[index]
        return instance.transform?.position?.[1] !== original.transform?.position?.[1]
      }).length

      // Update the store
      setObjectInstances(adjustedInstances)

      return {
        success: true,
        adjustedCount
      }

    } catch (error) {
      return {
        success: false,
        error: `Failed to adjust instances for perlin terrain: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}
