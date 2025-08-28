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
import { placeInstance, adjustAllInstancesForPerlinTerrain, adjustAllInstancesForTerrainAsync,
  type PlacementStrategyConfig, PlacementStrategy } from '@/features/scene/lib/placement/ObjectPlacementUtils'
import { GfxLayerType, GfxLayerShape } from '@/entities/layer'
import type {
  GfxProceduralTerrainSpec,
  GfxTerrainOpPool,
  GfxTerrainConfig,
  GfxTerrainOp,
  GfxOpsGenerationOptions
} from '@/entities/terrain'
import { ProceduralTerrainGenerator } from '@/features/scene/lib/terrain/ProceduralTerrainGenerator'
import { generateRandomSeed } from '@/features/scene/lib/terrain/utils/PRNGUtils'
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
   * Сгенерировать конфигурацию террейна по спецификации процедурной генерации.
   *
   * Метод является тонкой обёрткой над ProceduralTerrainGenerator и предназначен
   * для использования агентами и сценариями. На вход принимает полную спецификацию
   * мира и пула операций, возвращает готовый `GfxTerrainConfig`, который можно
   * напрямую применять в слоях сцены и сэмплерах высоты.
   *
   * Гарантируется детерминированность результата при одинаковом `spec.seed`.
   */
  static async generateProceduralTerrain(
    spec: GfxProceduralTerrainSpec
  ): Promise<GfxTerrainConfig> {
    const gen = new ProceduralTerrainGenerator()
    return gen.generateTerrain(spec)
  }

  /**
   * Сгенерировать массив операций рельефа (`GfxTerrainOp[]`) из пула рецептов.
   *
   * Требуются размеры мира для алгоритмов размещения. Если они не переданы в opts,
   * метод попытается взять их из подходящего Landscape/Terrain слоя текущей сцены.
   *
   * Параметр `opts.sampler` (необязателен) позволяет учитывать bias-фильтры
   * по высоте/уклону и избегание пересечений с существующим рельефом.
   */
  static async generateTerrainOpsFromPool(
    pool: GfxTerrainOpPool,
    seed?: number,
    opts?: GfxOpsGenerationOptions & { worldWidth?: number; worldHeight?: number }
  ): Promise<GfxTerrainOp[]> {
    const gen = new ProceduralTerrainGenerator()

    // Определяем размеры мира: из opts или из первого подходящего слоя
    let worldWidth = opts?.worldWidth
    let worldHeight = opts?.worldHeight

    if (!worldWidth || !worldHeight) {
      const layer = SceneAPI.pickLandscapeLayer()
      if (layer?.terrain?.worldWidth && layer?.terrain?.worldHeight) {
        worldWidth = layer.terrain.worldWidth
        worldHeight = layer.terrain.worldHeight
      }
    }

    if (!worldWidth || !worldHeight) {
      throw new Error('generateTerrainOpsFromPool: не заданы worldWidth/worldHeight и не найден Terrain-слой')
    }

    // Если seed не передан — генерируем автоматически для недетерминированного сценария
    const actualSeed = seed ?? generateRandomSeed()
    return gen.generateOpsFromPool(pool, actualSeed, {
      worldWidth,
      worldHeight,
      area: opts?.area,
      sampler: opts?.sampler
    })
  }

  /**
   * Создать слой сцены с процедурно сгенерированным террейном.
   *
   * Выполняет генерацию `GfxTerrainConfig` по переданной спецификации и создаёт
   * слой типа `Landscape` с формой `Terrain`. После создания слоя запускается
   * универсальное выравнивание существующих инстансов по рельефу через
   * `createLayerWithAdjustment`.
   *
   * Параметр `layerData` позволяет переопределить имя/видимость/позицию и др.
   */
  static async createProceduralLayer(
    spec: GfxProceduralTerrainSpec,
    layerData?: Partial<SceneLayer>
  ): Promise<{ success: boolean; layerId?: string; error?: string }> {
    try {
      const terrain = await SceneAPI.generateProceduralTerrain(spec)

      const base: Omit<SceneLayer, 'id'> = {
        name: layerData?.name ?? 'Процедурный ландшафт',
        type: GfxLayerType.Landscape,
        shape: GfxLayerShape.Terrain,
        width: spec.world.width,
        // Для слоя используем термин «depth» вместо «height»
        depth: spec.world.height,
        terrain,
        visible: layerData?.visible ?? true,
        position: layerData?.position ?? useSceneStore.getState().layers.length
      }

      const merged: Omit<SceneLayer, 'id'> = { ...base, ...layerData, terrain }

      // Создание слоя с автоматической корректировкой инстансов; уведомления отключаем для тестов/скриптов
      const result = await SceneAPI.createLayerWithAdjustment(merged, terrain, { showNotifications: false })
      return { success: result.success, layerId: result.layerId, error: result.error }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  /**
   * Выбрать подходящий landscape-слой для размещения объектов.
   * В приоритете слой с формой `Terrain`, иначе будет выбран любой слой типа `Landscape`.
   */
  private static pickLandscapeLayer(): SceneLayer | undefined {
    const state = useSceneStore.getState()
    return state.layers.find(layer =>
      layer.type === GfxLayerType.Landscape && layer.shape === GfxLayerShape.Terrain
    ) || state.layers.find(layer => layer.type === GfxLayerType.Landscape)
  }

  /**
   * Подготовить список уже существующих экземпляров с их BoundingBox для проверки коллизий.
   * Вычисляет bounding box каждого объекта (если он не сохранён в объекте),
   * и сопоставляет его с каждым существующим экземпляром для корректной проверки пересечений.
   */
  private static collectExistingInstancesWithBounds(): Array<{ instance: SceneObjectInstance; boundingBox: BoundingBox }>{
    const state = useSceneStore.getState()
    const result: Array<{ instance: SceneObjectInstance; boundingBox: BoundingBox }> = []
    state.objectInstances.forEach(instance => {
      const instanceObject = state.objects.find(obj => obj.uuid === instance.objectUuid)
      if (instanceObject) {
        const instanceBoundingBox = instanceObject.boundingBox || calculateObjectBoundingBox(instanceObject)
        result.push({ instance, boundingBox: instanceBoundingBox })
      }
    })
    return result
  }
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
    return SceneAPI.getSceneOverview().objects
  }

  /**
   * Получить список всех экземпляров объектов
   */
  static getSceneInstances(): SceneInstanceInfo[] {
    return SceneAPI.getSceneOverview().instances
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
    const overview = SceneAPI.getSceneOverview()
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
   * Работает только с новой архитектурой (legacy удалён)
   */
  static adjustInstancesForPerlinTerrain(terrainLayerId: string): { success: boolean; adjustedCount?: number; error?: string } {
    try {
      const state = useSceneStore.getState()
      const { objectInstances, layers, setObjectInstances } = state

      // Find the terrain layer (new architecture only)
      const terrainLayer = layers.find(layer =>
        layer.id === terrainLayerId &&
        layer.type === GfxLayerType.Landscape &&
        layer.shape === GfxLayerShape.Terrain &&
        layer.terrain
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

      // Find the terrain layer (new architecture only)
      const terrainLayer = layers.find(layer =>
        layer.id === terrainLayerId &&
        layer.type === GfxLayerType.Landscape &&
        layer.shape === GfxLayerShape.Terrain &&
        layer.terrain
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

      // Если создаётся Terrain-слой без конфигурации — задаём перлин по умолчанию
      let finalLayerData: Omit<SceneLayer, 'id'> = layerData
      const isTerrainLayer =
        (layerData as any).shape === GfxLayerShape.Terrain &&
        (layerData as any).type === GfxLayerType.Landscape

      if (terrainConfig) {
        finalLayerData = { ...layerData, terrain: terrainConfig }
      } else if (isTerrainLayer && !(layerData as any).terrain) {
        const w = (layerData as any).width || 1
        // Новое поле глубины; поддерживаем legacy height для совместимости
        const d = ((layerData as any).depth ?? (layerData as any).height) || 1
        const gridW = w > 200 ? 200 : w
        const gridH = d > 200 ? 200 : d
        const defaultTerrain: import('@/entities/terrain').GfxTerrainConfig = {
          worldWidth: w,
          worldHeight: d,
          edgeFade: 0.15,
          source: {
            kind: 'perlin',
            params: {
              seed: 1234,
              octaveCount: 4,
              amplitude: 0.1,
              persistence: 0.5,
              width: gridW,
              height: gridH
            }
          }
        }
        finalLayerData = { ...layerData, terrain: defaultTerrain }
      }

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
         createdLayer.terrain)

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
      const landscapeLayer = SceneAPI.pickLandscapeLayer()

      // Собрать существующие экземпляры для избежания коллизий
      const existingInstances = SceneAPI.collectExistingInstancesWithBounds()

      // Использовать новый placeInstance для создания экземпляров
      const createdInstances = placeInstance(
        objectUuid,
        {
          landscapeLayer,
          alignToTerrainHeight: true,
          alignToTerrainRotation: true,
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
      const landscapeLayer = SceneAPI.pickLandscapeLayer()

      // Собрать существующие экземпляры для избежания коллизий
      const existingInstances = SceneAPI.collectExistingInstancesWithBounds()

      // Использовать новый placeInstance для создания экземпляров
      const createdInstances = placeInstance(
        objectUuid,
        {
          landscapeLayer,
          alignToTerrainHeight: true,
          alignToTerrainRotation: true,
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

// Экспорт класса для использования в ScriptingPanel
export const sceneApi = SceneAPI
