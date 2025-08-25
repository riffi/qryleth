/**
 * Scene API для доступа AI агентов к данным и операциям со сценой
 * Предоставляет публичный интерфейс для взаимодействия с Zustand store
 */

import { useSceneStore } from '@/features/scene/model/sceneStore'
import { generateUUID } from '@/shared/lib/uuid'
import type { SceneObject, SceneObjectInstance, SceneData, SceneLayer } from '@/entities/scene/types'
import type { Transform } from '@/shared/types/transform'
import type { GfxObjectWithTransform } from '@/entities/object/model/types'
import { correctLLMGeneratedObject } from '@/features/scene/lib/correction/LLMGeneratedObjectCorrector'
import { placeInstance, adjustAllInstancesForPerlinTerrain, adjustAllInstancesForTerrainAsync, PlacementStrategyConfig, PlacementStrategy } from '@/features/scene/lib/placement/ObjectPlacementUtils'
import { GfxLayerType, GfxLayerShape } from '@/entities/layer'
import type { Vector3 } from '@/shared/types'
import { db, type ObjectRecord } from '@/shared/lib/database'
import {
  calculateObjectBoundingBox,
  transformBoundingBox
} from '@/shared/lib/geometry/boundingBoxUtils'
import type { BoundingBox } from '@/shared/types'
import { materialRegistry } from '@/shared/lib/materials/MaterialRegistry'
import type { GfxMaterial } from '@/entities/material'

/**
 * Simplified scene object info for agent tools
 */
export interface SceneObjectInfo {
  uuid: string
  name: string
  layerId?: string
  visible?: boolean
  /** UUID объекта в библиотеке, если применимо */
  libraryUuid?: string
  /** Ограничивающий объём объекта в локальных координатах */
  boundingBox?: BoundingBox
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
 * Результат добавления объекта из библиотеки
 */
export interface AddObjectResult {
  success: boolean
  objectUuid?: string
  instanceUuid?: string
  error?: string
}

/**
 * Параметры создания экземпляра объекта
 */
export interface InstanceCreationParams {
  position?: Vector3
  rotation?: Vector3
  scale?: Vector3
  visible?: boolean
}

/**
 * Информация о созданном экземпляре
 */
export interface CreatedInstanceInfo {
  instanceUuid: string
  objectUuid: string
  parameters: {
    position: Vector3
    rotation: Vector3
    scale: Vector3
    visible: boolean
  }
  boundingBox?: BoundingBox
}

/**
 * Результат массового добавления экземпляров
 */
export interface AddInstancesResult {
  success: boolean
  instanceCount: number
  instances?: CreatedInstanceInfo[]
  errors?: string[]
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

      const boundingBox = obj.boundingBox ?? calculateObjectBoundingBox(obj)

      return {
        uuid: obj.uuid,
        name: obj.name,
        layerId: obj.layerId,
        visible: obj.visible,
        libraryUuid: obj.libraryUuid,
        boundingBox,
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
   * Добавить один экземпляр объекта и вернуть информацию с BoundingBox
   */
  static addSingleObjectInstance(
    objectUuid: string,
    params: InstanceCreationParams
  ): AddInstancesResult {
    return this.addObjectInstances(objectUuid, [params])
  }

  /**
   * Добавить несколько экземпляров объекта по массиву параметров
   */
  static addObjectInstances(
    objectUuid: string,
    instances: InstanceCreationParams[]
  ): AddInstancesResult {
    try {
      const state = useSceneStore.getState()
      const baseObject = state.objects.find(obj => obj.uuid === objectUuid)
      if (!baseObject) {
        return {
          success: false,
          instanceCount: 0,
          error: `Object with UUID ${objectUuid} not found in scene`
        }
      }

      const objectBox =
        baseObject.boundingBox || calculateObjectBoundingBox(baseObject)

      const results: CreatedInstanceInfo[] = []
      const errors: string[] = []

      for (const inst of instances) {
        const position = inst.position ?? ([0, 0, 0] as Vector3)
        const rotation = inst.rotation ?? ([0, 0, 0] as Vector3)
        const scale = inst.scale ?? ([1, 1, 1] as Vector3)
        const visible = inst.visible ?? true

        const res = this.addObjectInstance(
          objectUuid,
          position,
          rotation,
          scale,
          visible
        )

        if (res.success && res.instanceUuid) {
          const bbox = transformBoundingBox(objectBox, {
            position,
            rotation,
            scale
          })
          results.push({
            instanceUuid: res.instanceUuid,
            objectUuid,
            parameters: { position, rotation, scale, visible },
            boundingBox: bbox
          })
        } else if (res.error) {
          errors.push(res.error)
        }
      }

      if (results.length > 0) {
        return {
          success: true,
          instanceCount: results.length,
          instances: results,
          errors: errors.length > 0 ? errors : undefined
        }
      }

      return {
        success: false,
        instanceCount: 0,
        errors,
        error: 'Failed to create any instances'
      }
    } catch (error) {
      return {
        success: false,
        instanceCount: 0,
        error: `Failed to add object instances: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      }
    }
  }

  /**
   * Создать несколько случайных экземпляров объекта с учетом ландшафта
   */
  static addRandomObjectInstances(
    objectUuid: string,
    count: number,
    options?: { rotation?: Vector3; scale?: Vector3; visible?: boolean; alignToTerrain?: boolean }
  ): AddInstancesResult {
    const state = useSceneStore.getState()
    const landscapeLayer = state.layers.find(layer => layer.type === GfxLayerType.Landscape)

    // Get the object to access its bounding box
    const baseObject = state.objects.find(obj => obj.uuid === objectUuid)
    if (!baseObject) {
      return {
        success: false,
        instanceCount: 0,
        error: `Object with UUID ${objectUuid} not found in scene`
      }
    }

    const objectBoundingBox = baseObject.boundingBox || calculateObjectBoundingBox(baseObject)

    // Collect existing instances and their bounding boxes for collision detection
    const existingInstances: Array<{ instance: SceneObjectInstance; boundingBox: import('@/shared/types').BoundingBox }> = []

    // Add existing instances from the scene
    state.objectInstances.forEach(instance => {
      const instanceObject = state.objects.find(obj => obj.uuid === instance.objectUuid)
      if (instanceObject) {
        const instanceBoundingBox = instanceObject.boundingBox || calculateObjectBoundingBox(instanceObject)
        existingInstances.push({
          instance,
          boundingBox: instanceBoundingBox
        })
      }
    })

    const instances: InstanceCreationParams[] = []
    for (let i = 0; i < count; i++) {
      const tempInstance: SceneObjectInstance = {
        uuid: '',
        objectUuid,
        transform: {
          position: [0, 0, 0],
          rotation: options?.rotation ?? ([0, 0, 0] as Vector3),
          scale: options?.scale ?? ([1, 1, 1] as Vector3)
        },
        visible: options?.visible ?? true
      }

      const placed = placeInstance(tempInstance, {
        landscapeLayer,
        alignToTerrain: options?.alignToTerrain,
        objectBoundingBox,
        existingInstances
      })

      instances.push({
        position: placed.transform.position,
        rotation: placed.transform.rotation,
        scale: options?.scale ?? ([1, 1, 1] as Vector3),
        visible: options?.visible ?? true
      })

      // Add the newly placed instance to existingInstances for next iterations
      const newInstance: SceneObjectInstance = {
        uuid: `temp-${i}`,
        objectUuid,
        transform: {
          position: placed.transform.position,
          rotation: placed.transform.rotation,
          scale: options?.scale ?? ([1, 1, 1] as Vector3)
        },
        visible: options?.visible ?? true
      }
      existingInstances.push({
        instance: newInstance,
        boundingBox: objectBoundingBox
      })
    }

    return this.addObjectInstances(objectUuid, instances)
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
   * Добавить объект с трансформацией в сцену.
   * Если объект был загружен из библиотеки, его UUID сохраняется
   * в поле libraryUuid для последующего отслеживания.
   * Метод объединяет функциональность handleObjectAdded из SceneEditorR3F.
   * Перед добавлением BoundingBox объекта вычисляется автоматически.
   */
  static addObjectWithTransform(objectData: GfxObjectWithTransform): AddObjectWithTransformResult {
    try {
      const state = useSceneStore.getState()
      const { addObject, addObjectInstance, layers } = state

      // Применить коррекцию для LLM-сгенерированных объектов
      const correctedObject = correctLLMGeneratedObject(objectData)
      // Рассчитать BoundingBox для объекта
      const boundingBox = calculateObjectBoundingBox(correctedObject)

      // Генерировать UUID для объекта
      const objectUuid = generateUUID()

      // Создать объект сцены
      const newObject: SceneObject = {
        uuid: objectUuid,
        name: correctedObject.name,
        primitives: correctedObject.primitives,
        boundingBox,
        layerId: 'objects',
        libraryUuid: correctedObject.libraryUuid,
        materials: correctedObject.materials

      }


      // Добавить объект в store
      addObject(newObject)

      // Найти подходящий landscape слой (логика из addInstanceToScene)
      const perlinLandscape = layers.find(layer =>
        layer.type === GfxLayerType.Landscape && layer.shape === GfxLayerShape.Terrain
      )
      const anyLandscape = layers.find(layer => layer.type === GfxLayerType.Landscape)
      const landscapeLayer = perlinLandscape || anyLandscape || null

      // Создать экземпляр объекта
      const instanceUuid = generateUUID()
      const newInstance: SceneObjectInstance = {
        uuid: instanceUuid,
        objectUuid: objectUuid,
        transform: correctedObject,
        visible: true
      }

      // Collect existing instances for collision detection
      const existingInstances: Array<{ instance: SceneObjectInstance; boundingBox: import('@/shared/types').BoundingBox }> = []
      state.objectInstances.forEach(instance => {
        const instanceObject = state.objects.find(obj => obj.uuid === instance.objectUuid)
        if (instanceObject) {
          const instanceBoundingBox = instanceObject.boundingBox || calculateObjectBoundingBox(instanceObject)
          existingInstances.push({
            instance,
            boundingBox: instanceBoundingBox
          })
        }
      })

      // Разместить экземпляр с учетом ландшафта
      const placedInstance = placeInstance(newInstance, {
        landscapeLayer,
        objectBoundingBox: boundingBox,
        existingInstances
      })

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
   * Выполняет поиск объектов в библиотеке по строке запроса
   * Возвращает список записей, удовлетворяющих условию
   */
  static async searchObjectsInLibrary(query: string): Promise<ObjectRecord[]> {
    try {
      const allObjects = await db.getAllObjects()
      const lower = query.toLowerCase()
      return allObjects.filter(obj =>
        obj.name.toLowerCase().includes(lower) ||
        (obj.description?.toLowerCase().includes(lower) ?? false)
      )
    } catch (error) {
      console.error('Ошибка поиска объектов в библиотеке:', error)
      return []
    }
  }

  /**
   * Добавляет объект из библиотеки в сцену с унифицированным размещением экземпляров
   * Обновленная версия для использования нового placeInstance с PlacementStrategyConfig
   * 
   * @param objectUuid - UUID объекта в библиотеке
   * @param layerId - ID слоя для размещения объекта (опционально, по умолчанию 'objects')
   * @param count - количество экземпляров для создания (по умолчанию 1)
   * @param placementStrategyConfig - конфигурация стратегии размещения
   * @returns результат добавления объекта и создания экземпляров
   */
  static async addObjectFromLibrary(
    objectUuid: string,
    layerId?: string,
    count: number = 1,
    placementStrategyConfig: PlacementStrategyConfig = { strategy: PlacementStrategy.Random }
  ): Promise<AddObjectResult> {
    try {
      const record = await db.getObject(objectUuid)
      if (!record) {
        return { success: false, error: `Object ${objectUuid} not found` }
      }

      // Подготовить данные объекта для создания через createObject
      const objectData: import('@/entities/object/model/types').GfxObject = {
        uuid: generateUUID(),
        name: record.name,
        primitives: record.objectData.primitives.map(p => ({ ...p, uuid: generateUUID() })),
        libraryUuid: record.uuid,
        materials: record.objectData.materials || []
      }

      // Использовать новый метод createObject для унифицированного создания
      const result = SceneAPI.createObject(
        objectData,
        layerId || 'objects',
        count,
        placementStrategyConfig
      )

      if (!result.success) {
        return result
      }

      return {
        success: true,
        objectUuid: result.objectUuid,
        instanceUuid: result.instanceUuid
      }

    } catch (error) {
      return {
        success: false,
        error: `Failed to add object from library: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Adjust all object instances for terrain when a terrain layer is added
   * Supports both new terrain architecture and legacy noiseData
   */
  static adjustInstancesForPerlinTerrain(terrainLayerId: string): { success: boolean; adjustedCount?: number; error?: string } {
    try {
      const state = useSceneStore.getState()
      const { objectInstances, layers, setObjectInstances } = state

      // Find the terrain layer (supports both new and legacy formats)
      const terrainLayer = layers.find(layer =>
        layer.id === terrainLayerId &&
        layer.type === GfxLayerType.Landscape &&
        layer.shape === GfxLayerShape.Terrain &&
        (layer.terrain || layer.noiseData) // Поддерживаем как новую архитектуру, так и legacy
      )

      if (!terrainLayer) {
        return {
          success: false,
          error: `Terrain layer with ID ${terrainLayerId} not found or has no terrain data`
        }
      }

      // Adjust all instances using the updated function that supports all terrain types
      const adjustedInstances = adjustAllInstancesForPerlinTerrain(
        objectInstances,
        terrainLayer,
        state.objects.map(obj => ({
          uuid: obj.uuid,
          boundingBox: obj.boundingBox || calculateObjectBoundingBox(obj)
        }))
      )

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
        error: `Failed to adjust instances for terrain: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Асинхронная версия функции корректировки экземпляров объектов для террейна.
   * Ожидает полной загрузки данных heightmap перед выравниванием инстансов.
   */
  static async adjustInstancesForTerrainAsync(terrainLayerId: string): Promise<{ success: boolean; adjustedCount?: number; error?: string }> {
    try {
      const state = useSceneStore.getState()
      const { objectInstances, layers, setObjectInstances } = state

      // Find the terrain layer (supports both new and legacy formats)
      const terrainLayer = layers.find(layer =>
        layer.id === terrainLayerId &&
        layer.type === GfxLayerType.Landscape &&
        layer.shape === GfxLayerShape.Terrain &&
        (layer.terrain || layer.noiseData) // Поддерживаем как новую архитектуру, так и legacy
      )

      if (!terrainLayer) {
        return {
          success: false,
          error: `Terrain layer with ID ${terrainLayerId} not found or has no terrain data`
        }
      }

      // Используем асинхронную версию для корректного ожидания загрузки heightmap данных
      const adjustedInstances = await adjustAllInstancesForTerrainAsync(
        objectInstances,
        terrainLayer,
        state.objects.map(obj => ({
          uuid: obj.uuid,
          boundingBox: obj.boundingBox || calculateObjectBoundingBox(obj)
        }))
      )

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
        error: `Failed to adjust instances for terrain: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Создать слой с автоматическим выравниванием объектов по террейну (если применимо).
   * Централизованный метод, который инкапсулирует всю логику создания слоев и последующего выравнивания.
   * 
   * @param layerData - данные для создания слоя
   * @param terrainConfig - конфигурация террейна (для heightmap слоев)
   * @param options - дополнительные опции
   */
  static async createLayerWithAdjustment(
    layerData: Omit<SceneLayer, 'id'>,
    terrainConfig?: import('@/entities/terrain').GfxTerrainConfig,
    options?: {
      /** Принудительно выравнивать объекты даже для не-terrain слоев */
      forceAdjustment?: boolean
      /** Максимальное количество попыток выравнивания */
      maxAttempts?: number
      /** Показывать ли уведомления */
      showNotifications?: boolean
    }
  ): Promise<{ success: boolean; layerId?: string; adjustedCount?: number; error?: string }> {
    try {
      const {
        forceAdjustment = false,
        maxAttempts = 15,
        showNotifications = true
      } = options || {}

      // Создаем данные слоя с terrain конфигурацией если есть
      const finalLayerData = terrainConfig ? {
        ...layerData,
        terrain: terrainConfig
      } : layerData

      // Создаем слой через существующий механизм store
      useSceneStore.getState().createLayer(finalLayerData)

      // Получаем созданный слой
      const createdLayers = useSceneStore.getState().layers
      const createdLayer = createdLayers[createdLayers.length - 1]

      if (!createdLayer) {
        return {
          success: false,
          error: 'Failed to create layer'
        }
      }

      // Определяем, нужно ли выравнивание объектов
      const shouldAdjust = forceAdjustment || 
        (createdLayer.type === GfxLayerType.Landscape && 
         createdLayer.shape === GfxLayerShape.Terrain &&
         (createdLayer.terrain || createdLayer.noiseData))

      if (shouldAdjust) {
        // Используем универсальную функцию выравнивания
        const { adjustObjectsForCreatedTerrain } = await import('./terrain/TerrainAdjustmentUtils')
        
        const adjustmentResult = await adjustObjectsForCreatedTerrain({
          layerId: createdLayer.id,
          maxAttempts,
          showSuccessNotification: showNotifications,
          showErrorNotification: showNotifications
        })

        return {
          success: true,
          layerId: createdLayer.id,
          adjustedCount: adjustmentResult.adjustedCount
        }
      }

      return {
        success: true,
        layerId: createdLayer.id,
        adjustedCount: 0
      }

    } catch (error) {
      console.error('Error in createLayerWithAdjustment:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Новые унифицированные методы SceneAPI (Фаза 3)

  /**
   * Основной метод для создания экземпляров существующих объектов
   * Использует новый placeInstance с дискриминированным объединением PlacementStrategyConfig
   * 
   * @param objectUuid - UUID существующего объекта в сцене
   * @param layerId - ID слоя для размещения объекта (опционально)
   * @param count - количество экземпляров для создания (по умолчанию 1)
   * @param placementStrategyConfig - конфигурация стратегии размещения
   * @returns результат создания экземпляров
   */
  static addInstances(
    objectUuid: string,
    layerId?: string,
    count: number = 1,
    placementStrategyConfig: PlacementStrategyConfig = { strategy: PlacementStrategy.Random }
  ): AddInstancesResult {
    try {
      const state = useSceneStore.getState()
      
      // Проверить существование объекта
      const existingObject = state.objects.find(obj => obj.uuid === objectUuid)
      if (!existingObject) {
        return {
          success: false,
          instanceCount: 0,
          error: `Object with UUID ${objectUuid} not found in scene`
        }
      }

      // Получить bounding box объекта
      const objectBoundingBox = existingObject.boundingBox || calculateObjectBoundingBox(existingObject)

      // Найти landscape слой для размещения
      const landscapeLayer = state.layers.find(layer => layer.type === GfxLayerType.Landscape)

      // Собрать существующие экземпляры для избежания коллизий
      const existingInstances: Array<{ instance: SceneObjectInstance; boundingBox: BoundingBox }> = []
      state.objectInstances.forEach(instance => {
        const instanceObject = state.objects.find(obj => obj.uuid === instance.objectUuid)
        if (instanceObject) {
          const instanceBoundingBox = instanceObject.boundingBox || calculateObjectBoundingBox(instanceObject)
          existingInstances.push({
            instance,
            boundingBox: instanceBoundingBox
          })
        }
      })

      // Использовать новый placeInstance для создания экземпляров
      const createdInstances = placeInstance(
        objectUuid,
        {
          landscapeLayer,
          alignToTerrain: true,
          objectBoundingBox,
          existingInstances
        },
        count,
        placementStrategyConfig
      )

      // Добавить все созданные экземпляры в store
      const createdInstancesInfo: CreatedInstanceInfo[] = []
      createdInstances.forEach(instance => {
        state.addObjectInstance(instance)
        
        const boundingBox = transformBoundingBox(objectBoundingBox, instance.transform!)
        createdInstancesInfo.push({
          instanceUuid: instance.uuid,
          objectUuid: instance.objectUuid,
          parameters: {
            position: instance.transform!.position,
            rotation: instance.transform!.rotation,
            scale: instance.transform!.scale,
            visible: instance.visible ?? true
          },
          boundingBox
        })
      })

      // Переместить объект на указанный слой если нужно
      if (layerId && layerId !== existingObject.layerId) {
        state.moveObjectToLayer(objectUuid, layerId)
      }

      return {
        success: true,
        instanceCount: createdInstances.length,
        instances: createdInstancesInfo
      }

    } catch (error) {
      return {
        success: false,
        instanceCount: 0,
        error: `Failed to add instances: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Создание нового объекта и размещение его экземпляров в сцене
   * Объединяет создание объекта и размещение экземпляров в одном методе
   * 
   * @param objectData - данные для создания нового объекта
   * @param layerId - ID слоя для размещения объекта (опционально, по умолчанию 'objects')
   * @param count - количество экземпляров для создания (по умолчанию 1)
   * @param placementStrategyConfig - конфигурация стратегии размещения
   * @returns результат создания объекта и размещения экземпляров
   */
  static createObject(
    objectData: import('@/entities/object/model/types').GfxObject,
    layerId?: string,
    count: number = 1,
    placementStrategyConfig: PlacementStrategyConfig = { strategy: PlacementStrategy.Random }
  ): AddObjectWithTransformResult {
    try {
      const state = useSceneStore.getState()
      const { addObject } = state

      // Применить коррекцию для LLM-сгенерированных объектов
      const correctedObject = correctLLMGeneratedObject(objectData)
      
      // Рассчитать BoundingBox для объекта
      const boundingBox = calculateObjectBoundingBox(correctedObject)

      // Генерировать UUID для объекта
      const objectUuid = generateUUID()

      // Создать объект сцены
      const newObject: SceneObject = {
        uuid: objectUuid,
        name: correctedObject.name,
        primitives: correctedObject.primitives,
        boundingBox,
        layerId: layerId || 'objects',
        libraryUuid: correctedObject.libraryUuid,
        materials: correctedObject.materials
      }

      // Добавить объект в store
      addObject(newObject)

      // Найти landscape слой для размещения
      const landscapeLayer = state.layers.find(layer => layer.type === GfxLayerType.Landscape)

      // Собрать существующие экземпляры для избежания коллизий
      const existingInstances: Array<{ instance: SceneObjectInstance; boundingBox: BoundingBox }> = []
      state.objectInstances.forEach(instance => {
        const instanceObject = state.objects.find(obj => obj.uuid === instance.objectUuid)
        if (instanceObject) {
          const instanceBoundingBox = instanceObject.boundingBox || calculateObjectBoundingBox(instanceObject)
          existingInstances.push({
            instance,
            boundingBox: instanceBoundingBox
          })
        }
      })

      // Использовать новый placeInstance для создания экземпляров
      const createdInstances = placeInstance(
        objectUuid,
        {
          landscapeLayer,
          alignToTerrain: true,
          objectBoundingBox: boundingBox,
          existingInstances
        },
        count,
        placementStrategyConfig
      )

      // Добавить первый экземпляр в store (остальные тоже нужно добавить)
      if (createdInstances.length > 0) {
        createdInstances.forEach(instance => {
          state.addObjectInstance(instance)
        })

        return {
          success: true,
          objectUuid: objectUuid,
          instanceUuid: createdInstances[0].uuid
        }
      } else {
        return {
          success: false,
          error: 'Failed to create any instances'
        }
      }

    } catch (error) {
      return {
        success: false,
        error: `Failed to create object: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Material operations

  /**
   * Получить список всех глобальных материалов
   */
  static getGlobalMaterials(): GfxMaterial[] {
    return materialRegistry.getGlobalMaterials()
  }

  /**
   * Получить материал по UUID (из глобального реестра или объекта)
   */
  static getMaterialByUuid(materialUuid: string): GfxMaterial | null {
    // Сначала проверяем глобальный реестр
    const globalMaterial = materialRegistry.get(materialUuid)
    if (globalMaterial) {
      return globalMaterial
    }

    // Затем проверяем материалы объектов в сцене
    const state = useSceneStore.getState()
    for (const obj of state.objects) {
      if (obj.materials) {
        const material = obj.materials.find(m => m.uuid === materialUuid)
        if (material) {
          return material
        }
      }
    }

    return null
  }

  /**
   * Получить все материалы для конкретного объекта сцены
   */
  static getObjectMaterials(objectUuid: string): GfxMaterial[] {
    const state = useSceneStore.getState()
    const object = state.objects.find(obj => obj.uuid === objectUuid)
    return object?.materials || []
  }


  /**
   * Получить статистику использования материалов в сцене
   */
  static getMaterialUsageStats(): {
    totalGlobalMaterials: number
    totalObjectMaterials: number
    materialsInUse: number
    unusedMaterials: number
  } {
    const globalMaterials = materialRegistry.getGlobalMaterials()
    const state = useSceneStore.getState()

    // Подсчитать материалы объектов
    const objectMaterials = state.objects.flatMap(obj => obj.materials || [])

    // Найти использованные материалы (через ссылки в примитивах)
    const usedMaterialUuids = new Set<string>()
    state.objects.forEach(obj => {
      obj.primitives.forEach(primitive => {
        if (primitive.objectMaterialUuid) {
          usedMaterialUuids.add(primitive.objectMaterialUuid)
        }
        if (primitive.globalMaterialUuid) {
          usedMaterialUuids.add(primitive.globalMaterialUuid)
        }
      })
    })

    const allMaterials = [...globalMaterials, ...objectMaterials]
    const materialsInUse = allMaterials.filter(m => usedMaterialUuids.has(m.uuid)).length
    const unusedMaterials = allMaterials.length - materialsInUse

    return {
      totalGlobalMaterials: globalMaterials.length,
      totalObjectMaterials: objectMaterials.length,
      materialsInUse,
      unusedMaterials
    }
  }
}
