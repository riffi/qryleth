/**
 * Scene API для доступа AI агентов к данным и операциям со сценой
 * Предоставляет публичный интерфейс для взаимодействия с Zustand store
 */

import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import { generateUUID } from '@/shared/lib/uuid'
import type { SceneObject, SceneObjectInstance, SceneData, SceneLayer } from '@/entities/scene/types'
import type { GfxBiome } from '@/entities/biome'
import { scatterBiomePureWithSurface, type BiomePlacement } from '@/features/scene/lib/biomes/BiomeScattering'
import { degToRad } from '@/shared/lib/math/number'
import type { Transform } from '@/shared/types/transform'
import type { GfxObjectWithTransform } from '@/entities/object/model/types'
import { correctLLMGeneratedObject } from '@/features/editor/scene/lib/correction/LLMGeneratedObjectCorrector'
import { placeInstance, adjustAllInstancesForPerlinTerrain, adjustAllInstancesForTerrainAsync,
  type PlacementStrategyConfig, PlacementStrategy } from '@/features/editor/scene/lib/placement/ObjectPlacementUtils'
import { GfxLayerType, GfxLayerShape } from '@/entities/layer'
import type {
  GfxProceduralTerrainSpec,
  GfxTerrainOpPool,
  GfxTerrainConfig,
  GfxTerrainOp,
  GfxOpsGenerationOptions
} from '@/entities/terrain'
import { ProceduralTerrainGenerator } from '@/features/editor/scene/lib/terrain/ProceduralTerrainGenerator'
import { generateRandomSeed } from '@/features/editor/scene/lib/terrain/utils/PRNGUtils'
import type { Vector3 } from '@/shared/types'
import { db, type ObjectRecord } from '@/shared/lib/database'
import {
  calculateObjectBoundingBox,
  transformBoundingBox
} from '@/shared/lib/geometry/boundingBoxUtils'
import type { BoundingBox } from '@/shared/types'
import { materialRegistry } from '@/shared/lib/materials/MaterialRegistry'
import type { GfxMaterial } from '@/entities/material'
import { MultiColorAPI } from './sceneAPI.multicolor'
import { getHeightSamplerForLayer, getTerrainSamplerAt } from '@/features/editor/scene/lib/placement/terrainAdapter'
import { normalToRotation as normalToRotationShared } from '@/shared/lib/placement/orientation'
import { calculateCurvature } from '@/features/editor/scene/lib/terrain/colorUtils'
import type { GfxCloudsConfig, GfxProceduralCloudSpec } from '@/entities/cloud'
import type { GfxEnvironmentContent, GfxCloudSet } from '@/entities/environment'
import { ProceduralCloudGenerator } from '@/features/editor/scene/lib/clouds/ProceduralCloudGenerator'

/**
 * Применяет автоповорот инстансов по нормали поверхности террейна.
 *
 * Для каждого инстанса берётся нормаль в его позиции (X,Z), вычисляется углы
 * наклона (rx, rz) с ограничением максимального наклона. Дополнительно угол
 * ограничивается с учётом кривизны поверхности (если задано влияние).
 *
 * Поворот вокруг Y, заданный в размещении (rotationYDeg), сохраняется и не
 * изменяется — добавляются только наклоны вокруг X и Z.
 *
 * Важно: функция предполагает, что данные heightmap/terrain готовы к чтению
 * (например, после adjustAllInstancesForTerrainAsync, который дожидается загрузки).
 */
function applySurfaceNormalRotation(
  instances: SceneObjectInstance[],
  placements: BiomePlacement[],
  terrainLayer?: SceneLayer
): SceneObjectInstance[] {
  if (!terrainLayer) return instances
  const sampler = getHeightSamplerForLayer(terrainLayer)
  if (!sampler) return instances

  return instances.map((inst, i) => {
    const p = placements[i]
    const alignCfg = p.alignToSurfaceNormal
    if (!alignCfg || !inst.transform?.position) return inst

    const [x, , z] = inst.transform.position
    const normal = sampler.getNormal(x, z)

    // Опционально ослабляем максимальный наклон с учётом кривизны
    const maxDeg = alignCfg.maxDeviationDeg
    const influence = Math.max(0, Math.min(1, alignCfg.curvatureInfluence ?? 0))
    const curvature = influence > 0 ? calculateCurvature(sampler, x, z) : 0
    const effectiveMaxRad = typeof maxDeg === 'number'
      ? degToRad(maxDeg) * (1 - curvature * influence)
      : undefined

    const [rx, , rz] = normalToRotationShared(normal, effectiveMaxRad)
    const prevRot = inst.transform.rotation ?? [0, 0, 0]
    return {
      ...inst,
      transform: {
        ...inst.transform,
        rotation: [
          (prevRot[0] || 0) + rx,
          prevRot[1] || 0,
          (prevRot[2] || 0) + rz
        ] as [number, number, number]
      }
    }
  })
}

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
    color?: string
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
  // =============================
  // Биомы: CRUD и операции скаттеринга (Фаза 7)
  // =============================

  /** Получить список биомов сцены */
  static getBiomes(): GfxBiome[] {
    return [...(useSceneStore.getState().biomes || [])]
  }

  /** Добавить биом в сцену */
  static addBiome(biome: GfxBiome): { success: boolean; biomeUuid?: string } {
    const state = useSceneStore.getState()
    try {
      const uuid = biome.uuid || generateUUID()
      state.addBiome({ ...biome, uuid })
      return { success: true, biomeUuid: uuid }
    } catch (e) {
      return { success: false }
    }
  }

  /** Обновить биом по UUID */
  static updateBiome(biomeUuid: string, updates: Partial<GfxBiome>): { success: boolean } {
    const state = useSceneStore.getState()
    try {
      state.updateBiome(biomeUuid, updates)
      return { success: true }
    } catch (e) {
      return { success: false }
    }
  }

  /** Удалить биом по UUID (инстансы не трогаем — ответственность вызывающей стороны) */
  static removeBiome(biomeUuid: string): { success: boolean } {
    const state = useSceneStore.getState()
    try {
      state.removeBiome(biomeUuid)
      return { success: true }
    } catch (e) {
      return { success: false }
    }
  }

  /** Получить инстансы сцены, привязанные к биому */
  static getInstancesByBiomeUuid(biomeUuid: string): SceneObjectInstance[] {
    const state = useSceneStore.getState()
    return state.objectInstances.filter(i => i.biomeUuid === biomeUuid)
  }

  /**
   * Выполнить скаттеринг для указанного биома: добавляет новые инстансы поверх существующих.
   * Применяет автоподстройку по террейну через adjustAllInstancesForTerrainAsync.
   */
  static async scatterBiome(
    biomeUuid: string,
    opts?: { landscapeLayerId?: string }
  ): Promise<{ success: boolean; created: number; warnings?: string[]; error?: string }> {
    try {
      const state = useSceneStore.getState()
      const biome = (state.biomes || []).find(b => b.uuid === biomeUuid)
      if (!biome) return { success: false, created: 0, error: `Biome ${biomeUuid} not found` }

      // Библиотека объектов для ядра скаттеринга
      const libraryRecords = await db.getAllObjects()
      const library = libraryRecords.map(rec => ({
        libraryUuid: rec.uuid,
        tags: (rec.tags || rec.objectData.tags || []).map(t => t.toLowerCase())
      })) as Array<{ libraryUuid: string; tags: string[] }>

      // Подготовка surface‑контекста при необходимости
      const baseHasSurface = !!biome.scattering?.surface
      const strataHasSurface = (biome.strata || []).some(s => !!s.scattering?.surface)
      const needSurface = baseHasSurface || strataHasSurface

      // Если требуется surface‑оценка — дождаться готовности heightmap‑сэмплеров
      if (needSurface) {
        const layerSamplers = state.layers
          .filter(l => l.type === GfxLayerType.Landscape && !!l.terrain)
          .map(l => getHeightSamplerForLayer(l))
          .filter(Boolean) as ReturnType<typeof getHeightSamplerForLayer>[]
        const waiters: Promise<void>[] = []
        for (const s of layerSamplers) {
          const ready = (s as any).isReady?.()
          if (ready === false && (s as any).ready) {
            waiters.push((s as any).ready())
          }
        }
        if (waiters.length > 0) {
          await Promise.all(waiters)
        }
      }

      // SurfaceContext: выбрать слой по (x,z); вне террейна — null (жёсткий reject в маске)
      const surfaceCtx = needSurface ? {
        getAt: (x: number, z: number) => {
          const res = getTerrainSamplerAt(state.layers, x, z)
          if (!res) return null
          return { sampler: res.sampler, seaLevel: res.seaLevel }
        }
      } : undefined

      // Генерация размещений
      const placements = scatterBiomePureWithSurface(biome, library, surfaceCtx)
      if (placements.length === 0) return { success: true, created: 0, warnings: ['No placements generated'] }

      // Убедиться, что для каждого libraryUuid есть объект в сцене
      const objectsByLibraryUuid = await SceneAPI.ensureSceneObjectsForLibrary(placements.map(p => p.libraryUuid))

      // Построить инстансы (Y скорректируем ниже)
      const newInstances: SceneObjectInstance[] = placements.map(p => {
        const objUuid = objectsByLibraryUuid.get(p.libraryUuid)!
        return {
          uuid: generateUUID(),
          objectUuid: objUuid,
          biomeUuid,
          transform: {
            position: [p.position[0], 0, p.position[2]],
            rotation: [0, degToRad(p.rotationYDeg), 0],
            scale: [p.uniformScale, p.uniformScale, p.uniformScale]
          },
          visible: true
        }
      })

      // Автоподстройка по террейну
      const terrainLayer = opts?.landscapeLayerId
        ? state.layers.find(l => l.id === opts!.landscapeLayerId)
        : SceneAPI.pickLandscapeLayer()

      let adjusted = newInstances
      if (terrainLayer) {
        const objectsForBounds = state.objects.map(o => ({ uuid: o.uuid, boundingBox: o.boundingBox }))
        adjusted = await adjustAllInstancesForTerrainAsync(newInstances, terrainLayer, objectsForBounds)
        // Применим наклон по нормали, если он задан в трансформе биома/страты (прокинут в placements)
        adjusted = applySurfaceNormalRotation(adjusted, placements, terrainLayer)
      }

      // Добавить в store
      adjusted.forEach(inst => state.addObjectInstance(inst))
      return { success: true, created: adjusted.length }
    } catch (e) {
      return { success: false, created: 0, error: e instanceof Error ? e.message : 'Unknown error' }
    }
  }

  /**
   * Полная регенерация инстансов биома: удалить старые и создать новые.
   * Если dry-run генерация даёт 0 — по умолчанию сохраняем старые (если не передан forceDelete).
   */
  static async regenerateBiomeInstances(
    biomeUuid: string,
    opts?: { landscapeLayerId?: string; forceDelete?: boolean }
  ): Promise<{ success: boolean; deleted: number; created: number; warnings?: string[]; error?: string }> {
    try {
      const state = useSceneStore.getState()
      const biome = (state.biomes || []).find(b => b.uuid === biomeUuid)
      if (!biome) return { success: false, deleted: 0, created: 0, error: `Biome ${biomeUuid} not found` }
      const libraryRecords = await db.getAllObjects()
      const library = libraryRecords.map(rec => ({
        libraryUuid: rec.uuid,
        tags: (rec.tags || rec.objectData.tags || []).map(t => t.toLowerCase())
      }))
      const placements = scatterBiomePure(biome, library as any)
      const existing = SceneAPI.getInstancesByBiomeUuid(biomeUuid)

      if (placements.length === 0 && !opts?.forceDelete) {
        return { success: true, deleted: 0, created: 0, warnings: ['No placements generated; kept existing'] }
      }

      // Удаляем старые
      if (existing.length > 0) {
        const remaining = state.objectInstances.filter(i => i.biomeUuid !== biomeUuid)
        state.setObjectInstances(remaining)
      }

      // Если нечего генерировать — выходим
      if (placements.length === 0) return { success: true, deleted: existing.length, created: 0 }

      // Обеспечить объекты и создать инстансы
      const objectsByLibraryUuid = await SceneAPI.ensureSceneObjectsForLibrary(placements.map(p => p.libraryUuid))
      const terrainLayer = opts?.landscapeLayerId
        ? state.layers.find(l => l.id === opts!.landscapeLayerId)
        : SceneAPI.pickLandscapeLayer()

      const newInstances: SceneObjectInstance[] = placements.map(p => ({
        uuid: generateUUID(),
        objectUuid: objectsByLibraryUuid.get(p.libraryUuid)!,
        biomeUuid,
        transform: {
          position: [p.position[0], 0, p.position[2]],
          rotation: [0, degToRad(p.rotationYDeg), 0],
          scale: [p.uniformScale, p.uniformScale, p.uniformScale]
        },
        visible: true
      }))

      let adjusted = newInstances
      if (terrainLayer) {
        const objectsForBounds = state.objects.map(o => ({ uuid: o.uuid, boundingBox: o.boundingBox }))
        adjusted = await adjustAllInstancesForTerrainAsync(newInstances, terrainLayer, objectsForBounds)
        adjusted = applySurfaceNormalRotation(adjusted, placements, terrainLayer)
      }
      adjusted.forEach(inst => state.addObjectInstance(inst))
      return { success: true, deleted: existing.length, created: adjusted.length }
    } catch (e) {
      return { success: false, deleted: 0, created: 0, error: e instanceof Error ? e.message : 'Unknown error' }
    }
  }

  /**
   * Убедиться, что для каждого libraryUuid существует объект в сцене.
   * При необходимости создаёт объект на основе записи библиотеки и возвращает map libraryUuid → scene objectUuid.
   */
  private static async ensureSceneObjectsForLibrary(libraryUuids: string[]): Promise<Map<string, string>> {
    const state = useSceneStore.getState()
    const map = new Map<string, string>()
    const unique = Array.from(new Set(libraryUuids))
    for (const libUuid of unique) {
      const existing = state.objects.find(o => o.libraryUuid === libUuid)
      if (existing) { map.set(libUuid, existing.uuid); continue }
      const rec = await db.getObject(libUuid)
      if (!rec) continue
      const objectUuid = generateUUID()
      const obj: SceneObject = {
        uuid: objectUuid,
        name: rec.name,
        primitives: rec.objectData.primitives,
        materials: rec.objectData.materials || [],
        boundingBox: calculateObjectBoundingBox({ uuid: objectUuid, name: rec.name, primitives: rec.objectData.primitives } as any),
        layerId: 'objects',
        libraryUuid: rec.uuid
      }
      state.addObject(obj)
      map.set(libUuid, objectUuid)
    }
    return map
  }
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
    opts?: GfxOpsGenerationOptions & { worldWidth?: number; worldDepth?: number; worldHeight?: number }
  ): Promise<GfxTerrainOp[]> {
    const gen = new ProceduralTerrainGenerator()

    // Определяем размеры мира: из opts или из первого подходящего слоя
    let worldWidth = opts?.worldWidth
    // Новый параметр — worldDepth; поддерживаем worldHeight как legacy алиас
    let worldDepth = (opts as any)?.worldDepth ?? (opts as any)?.worldHeight

    if (!worldWidth || !worldDepth) {
      const layer = SceneAPI.pickLandscapeLayer()
      if (layer?.terrain?.worldWidth && (layer?.terrain as any)?.worldDepth) {
        worldWidth = layer.terrain.worldWidth
        worldDepth = (layer.terrain as any).worldDepth
      }
    }

    if (!worldWidth || !worldDepth) {
      throw new Error('generateTerrainOpsFromPool: не заданы worldWidth/worldDepth и не найден Terrain-слой')
    }

    // Если seed не передан — генерируем автоматически для недетерминированного сценария
    const actualSeed = seed ?? generateRandomSeed()
    return gen.generateOpsFromPool(pool, actualSeed, {
      worldWidth,
      worldDepth,
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
   * Параметр `layerData` позволяет переопределить имя/видимость/позицию/цвет и др.
   * Поддерживает задание цвета слою террейна через параметр `color` или
   * многоцветной конфигурации через параметр `multiColor`.
   */
  static async createProceduralLayer(
    spec: GfxProceduralTerrainSpec,
    layerData?: Partial<SceneLayer>
  ): Promise<{ success: boolean; layerId?: string; error?: string }> {
    try {
      // Базовая конфигурация террейна по спецификации
      const terrainBase = await SceneAPI.generateProceduralTerrain(spec)
      // Позволяем переопределить отдельные поля террейна (например, center) через layerData.terrain
      const terrain: GfxTerrainConfig = { ...terrainBase, ...(layerData?.terrain ?? {}) }

      const base: Omit<SceneLayer, 'id'> = {
        name: layerData?.name ?? 'Процедурный ландшафт',
        type: GfxLayerType.Landscape,
        shape: GfxLayerShape.Terrain,
        // width/depth берём из spec.layer
        width: spec.layer?.width,
        // Для слоя используем термин «depth» вместо «height»
        depth: spec.layer?.depth,
        terrain,
        visible: layerData?.visible ?? true,
        position: layerData?.position ?? useSceneStore.getState().layers.length,
        // Поддержка цвета террейна
        color: layerData?.color,
        // Поддержка многоцветной окраски
        multiColor: layerData?.multiColor
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
      objectCount: objects.filter(obj => obj.layerId === layer.id).length,
      color: layer.color
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

  // =============================
  // Окружение: контейнер без слоя
  // =============================

  /**
   * Получить текущий контейнер окружения (новая архитектура) или null, если он не создан.
   */
  static getEnvironmentContent(): GfxEnvironmentContent { return useSceneStore.getState().environmentContent }

  /**
   * Обеспечить наличие единственного слоя окружения и привязанного к нему контейнера.
   * Если layerId передан — проверяет, что слой существует и имеет тип Environment; в противном случае создаёт новый.
   * Возвращает найденный/созданный слой окружения.
   */
  // ensureEnvironmentLayer удалён: окружение не связано со слоем и всегда присутствует в sceneStore

  // =============================
  // CRUD содержимого: Environment
  // =============================

  /** Вернуть контейнер окружения (или null, если не создан). */
  static getEnvironment(): GfxEnvironmentContent { return useSceneStore.getState().environmentContent }

  /** Установить/сменить слой окружения по ID; создаёт контейнер при отсутствии. */
  // setEnvironmentLayer удалён: окружение не связано со слоем

  /** Добавить набор облаков в окружение. */
  static addCloudSetToEnvironment(set: GfxCloudSet): { success: boolean } { try { useSceneStore.getState().addCloudSet(set); return { success: true } } catch { return { success: false } } }

  /** Обновить набор облаков окружения по ID. */
  static updateEnvironmentCloudSet(setId: string, updates: Partial<GfxCloudSet>): { success: boolean } { try { useSceneStore.getState().updateCloudSet(setId, updates); return { success: true } } catch { return { success: false } } }

  /** Удалить набор облаков окружения по ID. */
  static removeEnvironmentCloudSet(setId: string): { success: boolean } { try { useSceneStore.getState().removeCloudSet(setId); return { success: true } } catch { return { success: false } } }

  // =============================
  // CRUD содержимого: Landscape
  // =============================
  /** Вернуть контейнер ландшафта (или null). */
  static getLandscapeContent(): { layerId: string; items: import('@/entities/terrain').GfxLandscape[] } | null { return useSceneStore.getState().landscapeContent ?? null }

  /** Установить/сменить привязанный слой ландшафта по ID. */
  static setLandscapeLayer(layerId: string): { success: boolean } { try { useSceneStore.getState().setLandscapeLayer(layerId); return { success: true } } catch { return { success: false } } }

  /** Добавить площадку ландшафта. */
  static addLandscape(item: import('@/entities/terrain').GfxLandscape): { success: boolean } { try { useSceneStore.getState().addLandscapeItem(item); return { success: true } } catch { return { success: false } } }

  /** Обновить площадку ландшафта по ID. */
  static updateLandscape(id: string, updates: Partial<import('@/entities/terrain').GfxLandscape>): { success: boolean } { try { useSceneStore.getState().updateLandscapeItem(id, updates); return { success: true } } catch { return { success: false } } }

  /** Удалить площадку ландшафта по ID. */
  static removeLandscape(id: string): { success: boolean } { try { useSceneStore.getState().removeLandscapeItem(id); return { success: true } } catch { return { success: false } } }

  // =============================
  // CRUD содержимого: Water
  // =============================
  /** Вернуть все контейнеры воды. */
  static getWaterContent(): Array<{ layerId: string; items: import('@/entities/water').GfxWaterBody[] }> { return useSceneStore.getState().waterContent || [] }

  /** Добавить водоём в слой. */
  static addWaterBody(layerId: string, body: import('@/entities/water').GfxWaterBody): { success: boolean } { try { useSceneStore.getState().addWaterBody(layerId, body); return { success: true } } catch { return { success: false } } }

  /** Обновить водоём в слое по ID. */
  static updateWaterBody(layerId: string, bodyId: string, updates: Partial<import('@/entities/water').GfxWaterBody>): { success: boolean } { try { useSceneStore.getState().updateWaterBody(layerId, bodyId, updates); return { success: true } } catch { return { success: false } } }

  /** Удалить водоём из слоя по ID. */
  static removeWaterBody(layerId: string, bodyId: string): { success: boolean } { try { useSceneStore.getState().removeWaterBody(layerId, bodyId); return { success: true } } catch { return { success: false } } }

  // =============================
  // Окружение: глобальный ветер
  // =============================

  /** Вернуть текущие параметры ветра сцены (направление [x,z] и скорость) */
  static getWind(): { direction: [number, number]; speed: number } {
    return { ...useSceneStore.getState().environment.wind }
  }

  /** Установить параметры ветра: направление [x,z] и скорость (юниты/сек). Направление нормализуется. */
  static setWind(direction: [number, number], speed: number): { success: boolean } {
    try {
      useSceneStore.getState().setWind(direction, speed)
      return { success: true }
    } catch {
      return { success: false }
    }
  }

  /** Установить только направление ветра (будет нормализовано). */
  static setWindDirection(direction: [number, number]): { success: boolean } {
    try { useSceneStore.getState().setWindDirection(direction); return { success: true } } catch { return { success: false } }
  }

  /** Установить только скорость ветра (неотрицательную). */
  static setWindSpeed(speed: number): { success: boolean } {
    try { useSceneStore.getState().setWindSpeed(speed); return { success: true } } catch { return { success: false } }
  }

  // =============================
  // Облачные слои: CRUD и генерация
  // =============================

  /** Получить все слои типа Clouds */
  static getCloudLayers(): SceneLayer[] {
    const state = useSceneStore.getState()
    return state.layers.filter(l => l.type === GfxLayerType.Clouds)
  }

  /** Создать слой облаков. Если данные не заданы — создаёт пустой слой с именем по умолчанию. */
  static createCloudLayer(data?: Partial<SceneLayer> & { clouds?: GfxCloudsConfig }): { success: boolean; layerId?: string; error?: string } {
    try {
      const base: Omit<SceneLayer, 'id'> = {
        name: data?.name ?? 'Облака',
        type: GfxLayerType.Clouds,
        visible: data?.visible ?? true,
        position: data?.position ?? useSceneStore.getState().layers.length,
        clouds: data?.clouds ?? { items: [] }
      }
      useSceneStore.getState().createLayer(base)
      const created = useSceneStore.getState().layers.slice(-1)[0]
      return created ? { success: true, layerId: created.id } : { success: false, error: 'Failed to create cloud layer' }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
    }
  }

  /** Обновить слой облаков по ID */
  static updateCloudLayer(layerId: string, updates: Partial<SceneLayer>): { success: boolean; error?: string } {
    try { useSceneStore.getState().updateLayer(layerId, updates); return { success: true } } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Unknown error' } }
  }

  /** Удалить слой облаков по ID */
  static removeCloudLayer(layerId: string): { success: boolean } {
    try { useSceneStore.getState().deleteLayer(layerId); return { success: true } } catch { return { success: false } }
  }

  /**
   * Сгенерировать облака по спецификации и поместить их в контейнер окружения (новая архитектура).
   *
   * Поведение:
   * - При clearBefore === true — очищаются существующие наборы облаков и создаётся один новый CloudSet.
   * - Если spec.area отсутствует — область инферится из первого Terrain‑слоя (legacy) до миграции на LandscapeContent.
   */
  static async generateProceduralClouds(
    spec: GfxProceduralCloudSpec,
    opts?: { layerId?: string; clearBefore?: boolean }
  ): Promise<{ success: boolean; created: number; layerId: string; error?: string }> {
    try {
      // Окружение всегда доступно

      // Область: если не задана — берём размеры мира и центр из первого terrain-слоя
      if (!spec.area) {
        const terrain = SceneAPI.pickLandscapeLayer()
        if (terrain?.terrain?.worldWidth && (terrain.terrain as any)?.worldDepth) {
          const w = terrain.terrain.worldWidth
          const d = (terrain.terrain as any).worldDepth
          const c = (terrain.terrain as any).center as [number, number] | undefined
          const cx = c?.[0] ?? 0
          const cz = c?.[1] ?? 0
          const halfW = w / 2
          const halfD = d / 2
          // Используем геометрический центр террейна: область строго над террейном
          spec = {
            ...spec,
            area: {
              kind: 'rect',
              xMin: cx - halfW,
              xMax: cx + halfW,
              zMin: cz - halfD,
              zMax: cz + halfD
            }
          }
        } else {
          return { success: false, created: 0, layerId: 'environment', error: 'Cannot infer area: no Terrain layer with world size' }
        }
      }

      const gen = new ProceduralCloudGenerator()
      const cfg = gen.generateClouds(spec)

      // Обновление контейнера окружения: добавляем новый CloudSet или очищаем и создаём заново
      const store = useSceneStore.getState()
      const env = store.environmentContent
      if (opts?.clearBefore) {
        store.setEnvironmentContent({ cloudSets: [], wind: env?.wind })
      }
      const set: GfxCloudSet = { id: generateUUID(), items: cfg.items, meta: { seed: spec.seed, appearance: spec.appearance } }
      store.addCloudSet(set)

      return { success: true, created: cfg.items.length, layerId: 'environment' }
    } catch (e) {
      return { success: false, created: 0, layerId: opts?.layerId || '', error: e instanceof Error ? e.message : 'Unknown error' }
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
          worldDepth: d,
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

// Экспорт MultiColorAPI для использования в ScriptingPanel
export const multiColorApi = MultiColorAPI
