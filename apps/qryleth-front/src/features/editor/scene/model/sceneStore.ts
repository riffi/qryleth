import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { generateUUID } from '@/shared/lib/uuid.ts'
import type {
  SceneStore,
  SceneStoreState,
  SceneMetaData
} from '@/features/editor/scene/model/store-types'
import { UiMode, RenderProfile, type CameraPose } from '@/shared/types/ui'
import type {
  ViewMode,
  RenderMode,
  TransformMode,
  SelectedSceneObject,
  HoveredSceneObject
} from '@/shared/types/ui'
import type {
  SceneObject,
  SceneObjectInstance,
  SceneLayer
} from '@/entities/scene/types.ts'
import type { GfxBiome } from '@/entities/biome'
import { normalizePrimitive, ensurePrimitiveNames } from '@/entities/primitive'
import type { LightingSettings } from '@/entities/lighting'
import { DEFAULT_LIGHTING_PRESET_KEY, getLightingPreset } from './lighting-presets'
import { calculateObjectBoundingBox } from '@/shared/lib/geometry/boundingBoxUtils'
import { materialRegistry } from '@/shared/lib/materials/MaterialRegistry'
import type { GfxMaterial } from '@/entities/material'
import { GfxLayerType } from '@/entities/layer'
import type { GfxEnvironmentContent, GfxCloudSet } from '@/entities/environment'
import type { GfxWaterBody } from '@/entities/water'
import type { GfxLandscape } from '@/entities/terrain'

// Берём значения из пресета по умолчанию ("Яркий день") и дополняем служебными полями
const initialPreset = getLightingPreset(DEFAULT_LIGHTING_PRESET_KEY)
const initialLighting: LightingSettings = {
  ambient: {
    uuid: 'ambient-light',
    ...(initialPreset.ambient ?? { color: '#87CEEB', intensity: 1 }),
  },
  directional: {
    uuid: 'directional-light',
    castShadow: true,
    position: initialPreset.directional?.position ?? [10, 10, 10],
    ...(initialPreset.directional ?? { color: '#FFD700', intensity: 1.0 }),
  },
  fog: {
    enabled: false,
    type: 'exponential',
    color: '#c2dde6',
    near: 200,
    far: 1000,
    density: 0.001,
  },
  backgroundColor: initialPreset.backgroundColor ?? '#87CEEB',
  sky: initialPreset.sky,
  exposure: initialPreset.exposure ?? 1.0,
}

const initialLayers: SceneLayer[] = [
  {
    id: 'objects',
    name: 'Объекты',
    type: GfxLayerType.Object,
    visible: true,
    position: 0
  }
]

const initialSceneMetaData: SceneMetaData = {
  name: 'Новая сцена',
  status: 'draft'
}

const initialState: SceneStoreState = {
  // Scene data
  objects: [],
  objectInstances: [],
  layers: initialLayers,
  lighting: initialLighting,
  // Биомы сцены (области скаттеринга)
  biomes: [],
  // Окружение сцены: глобальный ветер по умолчанию дует вдоль +X со скоростью 0.2 юнит/сек
  // ВНИМАНИЕ: legacy-поле. Будет удалено после миграции UI/рендеров на environmentContent
  environment: {
    wind: {
      direction: [1, 0],
      speed: 0.2,
    },
  },

  // Новая архитектура содержимого слоёв
  landscapeContent: null as { layerId: string; items: GfxLandscape[] } | null,
  waterContent: [] as Array<{ layerId: string; items: GfxWaterBody[] }>,
  environmentContent: null as GfxEnvironmentContent | null,

  // UI state
  uiMode: UiMode.Edit,
  renderProfile: RenderProfile.Edit,
  viewMode: 'orbit',
  renderMode: 'solid',
  transformMode: 'translate',
  selectedObject: null,
  hoveredObject: null,
  gridVisible: true,
  // Автопривязка цели OrbitControls к выбранному инстансу включена по умолчанию
  autoOrbitTargetOnSelect: true,
  cameraPose: undefined,
  // Флаг прелоадера применения heightmap
  isTerrainApplying: false,
  // Видимость хелпера камеры теней направленного света (DirectionalLight)
  shadowCameraHelperVisible: false,

  // Scene metadata
  sceneMetaData: initialSceneMetaData,

  // History
  history: [],
  historyIndex: -1
}

export const useSceneStore = create<SceneStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Object management
    setObjects: (objects: SceneObject[]) => {
      const normalized = objects.map(obj => ({
        ...obj,
        uuid: obj.uuid || generateUUID(),
        visible: obj.visible !== false,
        primitives: ensurePrimitiveNames(obj.primitives.map(normalizePrimitive)),
        libraryUuid: obj.libraryUuid
      }))
      set({ objects: normalized })
      get().saveToHistory()
    },

    addObject: (object: SceneObject) => {
      const normalized = {
        ...object,
        uuid: object.uuid || generateUUID(),
        visible: object.visible !== false,
        primitives: ensurePrimitiveNames(object.primitives.map(normalizePrimitive)),
        libraryUuid: object.libraryUuid
      }
      const objects = [...get().objects, normalized]
      set({ objects })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    removeObject: (objectUuid: string) => {
      const objects = get().objects.filter(obj => obj.uuid !== objectUuid)
      const filtered = get().objectInstances.filter(p => p.objectUuid !== objectUuid)
      set({ objects, objectInstances: filtered })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    /**
     * Обновляет объект сцены по его UUID.
     * Если передан новый список примитивов, он предварительно
     * нормализуется и заменяет текущий. Все поля, отсутствующие
     * во входящих данных, остаются без изменений.
     */
    updateObject: (objectUuid: string, updates: Partial<SceneObject>) => {
      const normalizedUpdates: Partial<SceneObject> = { ...updates }

      if (updates.primitives) {
        normalizedUpdates.primitives = ensurePrimitiveNames(
          updates.primitives.map(normalizePrimitive)
        )
      }

      const objects = get().objects.map(obj => {
        if (obj.uuid !== objectUuid) return obj

        const updated = { ...obj, ...normalizedUpdates }
        if (normalizedUpdates.primitives) {
          updated.boundingBox = calculateObjectBoundingBox({
            uuid: obj.uuid,
            name: obj.name,
            primitives: normalizedUpdates.primitives
          })
        }
        return updated
      })
      set({ objects })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    // Object instance management
    setObjectInstances: (objectInstances: SceneObjectInstance[]) => {
      const normalized = objectInstances.map(p => ({
        ...p,
        uuid: p.uuid || generateUUID(),
        visible: p.visible !== false
      }))
      set({ objectInstances: normalized })
      get().saveToHistory()
    },

    addObjectInstance: (objectInstance: SceneObjectInstance) => {
      const normalized = {
        ...objectInstance,
        uuid: objectInstance.uuid || generateUUID(),
        visible: objectInstance.visible !== false
      }
      const list = [...get().objectInstances, normalized]
      set({ objectInstances: list })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    /**
     * Обновляет инстанс объекта по его UUID.
     * Полученные изменения применяются к найденному инстансу,
     * после чего состояние сохраняется в историю и сцена помечается как измененная.
     */
    updateObjectInstance: (
      instanceId: string,
      updates: Partial<SceneObjectInstance>
    ) => {
      const list = get().objectInstances.map(instance =>
        instance.uuid === instanceId ? { ...instance, ...updates } : instance
      )
      set({ objectInstances: list })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    removeObjectInstance: (index: number) => {
      const list = get().objectInstances.filter((_, i) => i !== index)
      set({ objectInstances: list })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    // Biome management
    /**
     * Заменяет текущий список биомов сцены.
     * Выполняет минимальную нормализацию (генерация uuid при отсутствии)
     * и сохраняет состояние в историю без пометки как изменённое (для загрузки сцены).
     */
    setBiomes: (biomes: GfxBiome[]) => {
      const normalized = biomes.map(b => ({
        ...b,
        uuid: b.uuid || generateUUID(),
        visible: b.visible !== false,
      }))
      set({ biomes: normalized })
      get().saveToHistory()
    },
    /**
     * Добавляет новый биом в сцену.
     * Генерирует uuid при необходимости, включает visible по умолчанию,
     * сохраняет историю и помечает сцену как изменённую.
     */
    addBiome: (biome: GfxBiome) => {
      const normalized: GfxBiome = {
        ...biome,
        uuid: biome.uuid || generateUUID(),
        visible: biome.visible !== false,
      }
      set({ biomes: [...get().biomes, normalized] })
      get().saveToHistory()
      get().markSceneAsModified()
    },
    /**
     * Обновляет биом по его UUID частичным набором полей.
     * Сохраняет историю и помечает сцену как изменённую.
     */
    updateBiome: (biomeUuid: string, updates: Partial<GfxBiome>) => {
      const biomes = get().biomes.map(b => (b.uuid === biomeUuid ? { ...b, ...updates } : b))
      set({ biomes })
      get().saveToHistory()
      get().markSceneAsModified()
    },
    /**
     * Удаляет биом по UUID. Инстансы, привязанные к биому (biomeUuid),
     * не удаляются автоматически — ответственность вызывающей стороны
     * решить, что делать (очистить или переassign).
     */
    removeBiome: (biomeUuid: string) => {
      set({ biomes: get().biomes.filter(b => b.uuid !== biomeUuid) })
      get().saveToHistory()
      get().markSceneAsModified()
    },


    // Layer management
    setLayers: (layers: SceneLayer[]) => {
      // Нормализуем legacy-поля: height → depth для слоёв
      const normalized = layers.map(l => {
        const depth = (l as any).depth ?? (l as any).height
        return depth !== undefined ? ({ ...l, depth } as SceneLayer) : l
      })
      set({ layers: normalized })
      get().saveToHistory()
    },

    /**
     * Создать новый слой сцены.
     *
     * Использование Math.random ранее приводило к риску получения
     * одинаковых идентификаторов. Теперь применяем generateUUID
     * для гарантии уникальности.
     */
    createLayer: (layerData: Omit<SceneLayer, 'id'>) => {
      const newLayer: SceneLayer = {
        ...layerData,
        id: generateUUID()
      }
      const layers = [...get().layers, newLayer]
      set({ layers })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    updateLayer: (layerId: string, updates: Partial<SceneLayer>) => {
      const layers = get().layers.map(layer =>
        layer.id === layerId ? { ...layer, ...updates } : layer
      )
      set({ layers })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    deleteLayer: (layerId: string) => {
      if (layerId === 'objects') return // Cannot delete default layer

      const layers = get().layers.filter(layer => layer.id !== layerId)
      const objects = get().objects.map(obj =>
        obj.layerId === layerId ? { ...obj, layerId: 'objects' } : obj
      )

      set({ layers, objects })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    toggleLayerVisibility: (layerId: string) => {
      const layers = get().layers.map(layer =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
      set({ layers })
      get().markSceneAsModified()
    },

    toggleObjectVisibility: (objectUuid: string) => {
      const objects = get().objects.map(obj =>
        obj.uuid === objectUuid ? { ...obj, visible: obj.visible === false ? true : !obj.visible } : obj
      )
      set({ objects })
      get().markSceneAsModified()
    },

    toggleInstanceVisibility: (objectUuid: string, instanceId: string) => {
      const list = get().objectInstances.map(inst =>
        inst.uuid === instanceId
          ? { ...inst, visible: inst.visible === false ? true : !inst.visible }
          : inst
      )
      set({ objectInstances: list })
      get().markSceneAsModified()
    },

    moveObjectToLayer: (objectUuid: string, layerId: string) => {
      const objects = get().objects.map(obj =>
        obj.uuid === objectUuid ? { ...obj, layerId } : obj
      )
      set({ objects })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    // Lighting
    /**
     * Заменяет текущие настройки освещения сцены.
     */
    setLighting: (lighting: LightingSettings) => {
      set({ lighting })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    /**
     * Обновляет отдельные параметры освещения сцены.
     */
    updateLighting: (updates: Partial<LightingSettings>) => {
      const lighting = { ...get().lighting, ...updates }
      set({ lighting })
      get().saveToHistory()
      get().markSceneAsModified()
    },

    // Selection
    selectObject: (objectUuid: string, instanceUuid?: string, isInstanced?: boolean) => {

      const selectedObject: SelectedSceneObject = {
        objectUuid,
        instanceUuid,
        isInstanced
      }
      set({ selectedObject })
    },

    clearSelection: () => {
      set({ selectedObject: null })
    },

    setHoveredObject: (objectUuid: string, instanceId?: string) => {
      let objectInstanceIndex: number | undefined = undefined
      if (instanceId) {
        const instances = get().objectInstances
        objectInstanceIndex = instances.findIndex(p => p.uuid === instanceId)
        if (objectInstanceIndex === -1) objectInstanceIndex = undefined
      }

      const hoveredObject: HoveredSceneObject = {
        objectUuid,
        instanceId,
        objectInstanceIndex
      }
      set({ hoveredObject })
    },

    clearHover: () => {
      set({ hoveredObject: null })
    },

    // View controls
    /**
     * Устанавливает глобальный режим UI страницы редактора.
     * Допустимые значения: UiMode.Edit | UiMode.Play.
     * Не пересоздаёт сцену; влияет на отображение панелей/хедера на уровне UI.
     */
    setUiMode: (uiMode: UiMode) => {
      set({ uiMode })
    },

    /**
     * Переключает play-режим между Edit и Play.
     * Дополнительно синхронизирует renderProfile:
     * - UiMode.Edit  → RenderProfile.Edit
     * - UiMode.Play  → RenderProfile.View
     */
    togglePlay: () => {
      const nextUi = get().uiMode === UiMode.Edit ? UiMode.Play : UiMode.Edit
      const nextProfile = nextUi === UiMode.Play ? RenderProfile.View : RenderProfile.Edit
      set({ uiMode: nextUi, renderProfile: nextProfile })
    },

    /**
     * Устанавливает профиль рендера. На данном этапе это флаг без смены настроек.
     */
    setRenderProfile: (renderProfile: RenderProfile) => {
      set({ renderProfile })
    },

    setViewMode: (viewMode: ViewMode) => {
      set({ viewMode })
    },

    setRenderMode: (renderMode: RenderMode) => {
      set({ renderMode })
    },

    setTransformMode: (transformMode: TransformMode) => {
      set({ transformMode })
    },

    toggleGridVisibility: () => {
      set(state => ({ gridVisible: !state.gridVisible }))
    },

    /**
     * Переключает режим автопривязки цели OrbitControls к выбранному инстансу.
     * Если включено — при выборе/клике по инстансу камера автоматически наводится
     * на его центр (устанавливается target). Если выключено — выбор не меняет цель.
     */
    toggleAutoOrbitTargetOnSelect: () => {
      set(state => ({ autoOrbitTargetOnSelect: !state.autoOrbitTargetOnSelect }))
    },

    /**
     * Устанавливает явно состояние автопривязки цели OrbitControls.
     * @param enabled true — включить автопривязку; false — отключить.
     */
    setAutoOrbitTargetOnSelect: (enabled: boolean) => {
      set({ autoOrbitTargetOnSelect: enabled })
    },

    /**
     * Включает флаг применения heightmap, блокируя рендер UI через оверлей.
     * Использовать непосредственно перед началом загрузки/миграции массива высот.
     */
    startTerrainApplying: () => {
      if (!get().isTerrainApplying) set({ isTerrainApplying: true })
    },

    /**
     * Выключает флаг применения heightmap, снимая блокировку оверлея в UI.
     * Вызывать после получения данных (колбэк onHeightmapLoaded или кэш).
     */
    finishTerrainApplying: () => {
      if (get().isTerrainApplying) set({ isTerrainApplying: false })
    },

    /**
     * Устанавливает видимость хелпера камеры теней DirectionalLight.
     * @param visible true — показать хелпер; false — скрыть хелпер.
     */
    setShadowCameraHelperVisible: (visible: boolean) => {
      set({ shadowCameraHelperVisible: visible })
    },

    /**
     * Переключает видимость хелпера камеры теней DirectionalLight.
     * Удобно для привязки к иконке‑тумблеру в панели настроек света.
     */
    toggleShadowCameraHelperVisible: () => {
      set(state => ({ shadowCameraHelperVisible: !state.shadowCameraHelperVisible }))
    },

    // =====================
    // Environment / Wind
    // =====================
    /**
     * Установить глобальные параметры ветра сцены.
     *
     * Направление нормализуется к длине 1, чтобы избежать косвенной зависимости
     * от масштаба вектора. Если передан нулевой вектор, используется [1,0].
     * Скорость приводится к неотрицательному значению (минимум 0).
     */
    setWind: (direction: [number, number], speed: number) => {
      const [dx, dz] = direction
      const len = Math.hypot(dx, dz)
      const dir: [number, number] = len > 1e-6 ? [dx / len, dz / len] : [1, 0]
      const v = Math.max(0, Number.isFinite(speed) ? speed : 0)
      set(state => ({
        environment: { ...state.environment, wind: { direction: dir, speed: v } },
        environmentContent: state.environmentContent ? { ...state.environmentContent, wind: { direction: dir, speed: v } } : state.environmentContent
      }))
      get().markSceneAsModified()
    },

    /**
     * Установить только направление ветра. Значение автоматически нормализуется.
     * При нулевом векторе направление сбрасывается на [1,0].
     */
    setWindDirection: (direction: [number, number]) => {
      const [dx, dz] = direction
      const len = Math.hypot(dx, dz)
      const dir: [number, number] = len > 1e-6 ? [dx / len, dz / len] : [1, 0]
      set(state => ({
        environment: { ...state.environment, wind: { ...state.environment.wind, direction: dir } },
        environmentContent: state.environmentContent ? { ...state.environmentContent, wind: { ...(state.environmentContent.wind ?? { direction: [1,0] as [number, number], speed: 0 }), direction: dir } } : state.environmentContent
      }))
      get().markSceneAsModified()
    },

    /**
     * Установить только скорость ветра. Отрицательные значения приводятся к 0.
     */
    setWindSpeed: (speed: number) => {
      const v = Math.max(0, Number.isFinite(speed) ? speed : 0)
      set(state => ({
        environment: { ...state.environment, wind: { ...state.environment.wind, speed: v } },
        environmentContent: state.environmentContent ? { ...state.environmentContent, wind: { ...(state.environmentContent.wind ?? { direction: [1,0] as [number, number], speed: 0 }), speed: v } } : state.environmentContent
      }))
      get().markSceneAsModified()
    },

    /**
     * Полностью заменить контейнер окружения или сбросить его в null.
     * Также синхронизирует legacy environment.wind для обратной совместимости UI в переходный период.
     */
    setEnvironmentContent: (content: GfxEnvironmentContent) => {
      set(state => ({
        environmentContent: content,
        environment: content.wind ? { ...state.environment, wind: { ...content.wind } } : state.environment
      }))
      get().saveToHistory(); get().markSceneAsModified()
    },
    /** Добавить набор облаков в окружение. */
    addCloudSet: (set: GfxCloudSet) => {
      const current = get().environmentContent
      const next: GfxEnvironmentContent = { ...current, cloudSets: [...(current?.cloudSets ?? []), set] }
      get().setEnvironmentContent(next)
    },
    /** Обновить набор облаков по ID. */
    updateCloudSet: (setId: string, updates: Partial<GfxCloudSet>) => {
      const current = get().environmentContent
      const cloudSets = (current.cloudSets ?? []).map(s => s.id === setId ? { ...s, ...updates } : s)
      get().setEnvironmentContent({ ...current, cloudSets })
    },
    /** Удалить набор облаков по ID. */
    removeCloudSet: (setId: string) => {
      const current = get().environmentContent
      const cloudSets = (current.cloudSets ?? []).filter(s => s.id !== setId)
      get().setEnvironmentContent({ ...current, cloudSets })
    },
    /** Установить параметры ветра окружения. Также синхронизирует legacy environment.wind. */
    setEnvWind: (direction: [number, number], speed: number) => {
      const [dx, dz] = direction
      const len = Math.hypot(dx, dz)
      const dir: [number, number] = len > 1e-6 ? [dx / len, dz / len] : [1, 0]
      const v = Math.max(0, Number.isFinite(speed) ? speed : 0)
      const current = get().environmentContent
      const next = { ...current, wind: { direction: dir, speed: v } }
      set(state => ({ environmentContent: next, environment: { ...state.environment, wind: { direction: dir, speed: v } } }))
      get().saveToHistory(); get().markSceneAsModified()
    },
    /** Установить только направление ветра окружения. */
    setEnvWindDirection: (direction: [number, number]) => {
      const c = get().environmentContent
      const speed = c?.wind?.speed ?? get().environment.wind.speed
      get().setEnvWind(direction, speed)
    },
    /** Установить только скорость ветра окружения. */
    setEnvWindSpeed: (speed: number) => {
      const c = get().environmentContent
      const dir = c?.wind?.direction ?? get().environment.wind.direction
      get().setEnvWind(dir, speed)
    },
    /** Установить/обновить параметры неба окружения. */
    setEnvSky: (sky) => {
      const current = get().environmentContent
      if (!current) return
      get().setEnvironmentContent({ ...current, sky: { ...(current.sky ?? {}), ...sky } })
    },
    /** Установить/обновить параметры тумана окружения. */
    setEnvFog: (fog) => {
      const current = get().environmentContent
      if (!current) return
      get().setEnvironmentContent({ ...current, fog: { ...(current.fog ?? { enabled: false, type: 'exponential', color: '#c2dde6' }), ...fog } })
    },
    /** Установить экспозицию окружения. */
    setEnvExposure: (exposure: number) => {
      const current = get().environmentContent
      if (!current) return
      get().setEnvironmentContent({ ...current, exposure })
    },

    /** Полностью заменить контейнер ландшафта. */
    setLandscapeContent: (content) => {
      set({ landscapeContent: content })
      get().saveToHistory(); get().markSceneAsModified()
    },
    /** Установить/сменить связанный слой ландшафта. Создаёт контейнер при отсутствии. */
    setLandscapeLayer: (layerId: string) => {
      const current = get().landscapeContent
      const next = current ? { ...current, layerId } : { layerId, items: [] as GfxLandscape[] }
      get().setLandscapeContent(next)
    },
    /** Добавить площадку ландшафта. */
    addLandscapeItem: (item) => {
      const current = get().landscapeContent
      const next = current ? { ...current, items: [...current.items, item] } : { layerId: 'landscape', items: [item] }
      get().setLandscapeContent(next)
    },
    /** Обновить площадку ландшафта по ID. */
    updateLandscapeItem: (id, updates) => {
      const current = get().landscapeContent
      if (!current) return
      const items = current.items.map(it => it.id === id ? { ...it, ...updates } : it)
      get().setLandscapeContent({ ...current, items })
    },
    /** Удалить площадку ландшафта по ID. */
    removeLandscapeItem: (id) => {
      const current = get().landscapeContent
      if (!current) return
      const items = current.items.filter(it => it.id !== id)
      get().setLandscapeContent({ ...current, items })
    },

    /** Полностью заменить контейнеры воды. */
    setWaterContent: (containers) => {
      set({ waterContent: containers })
      get().saveToHistory(); get().markSceneAsModified()
    },
    /** Добавить водоём в слой (создавая контейнер при отсутствии). */
    addWaterBody: (layerId, body) => {
      const list = get().waterContent || []
      const idx = list.findIndex(c => c.layerId === layerId)
      if (idx === -1) {
        get().setWaterContent([ ...list, { layerId, items: [body] } ])
      } else {
        const next = list.map((c, i) => i === idx ? { ...c, items: [...c.items, body] } : c)
        get().setWaterContent(next)
      }
    },
    /** Обновить водоём по ID в контейнере слоя. */
    updateWaterBody: (layerId, bodyId, updates) => {
      const list = get().waterContent || []
      const idx = list.findIndex(c => c.layerId === layerId)
      if (idx === -1) return
      const container = list[idx]
      const items = container.items.map(b => b.id === bodyId ? { ...b, ...updates } : b)
      const next = list.map((c, i) => i === idx ? { ...c, items } : c)
      get().setWaterContent(next)
    },
    /** Удалить водоём по ID из контейнера слоя. */
    removeWaterBody: (layerId, bodyId) => {
      const list = get().waterContent || []
      const idx = list.findIndex(c => c.layerId === layerId)
      if (idx === -1) return
      const container = list[idx]
      const items = container.items.filter(b => b.id !== bodyId)
      const next = list.map((c, i) => i === idx ? { ...c, items } : c)
      get().setWaterContent(next)
    },

    /**
     * Сохраняет текущую позу камеры (позиция, цель/ориентация) для последующего восстановления.
     * Используется при переключении UiMode и смене типа камеры.
     */
    saveCameraPose: (pose: CameraPose) => {
      set({ cameraPose: pose })
    },

    /**
     * Возвращает сохранённую позу камеры (если есть) и не очищает её.
     * Очищение оставляем вызывающей стороне по необходимости.
     */
    restoreCameraPose: () => {
      return get().cameraPose
    },

    // Scene management
    setSceneMetadata: (sceneMetaData: SceneMetaData) => {
      set({ sceneMetaData: sceneMetaData })
    },

    markSceneAsModified: () => {
      const sceneMetaData = get().sceneMetaData
      if (sceneMetaData.status === 'saved') {
        set({
          sceneMetaData: { ...sceneMetaData, status: 'modified' }
        })
      } else if (sceneMetaData.status === 'draft') {
        set({
          sceneMetaData: { ...sceneMetaData, status: 'modified' }
        })
      }
    },

    loadSceneData: (data: any, sceneName?: string, sceneUuid?: string) => {
      if (data && typeof data === 'object') {
        const state = get()

        // Load scene data
        if (data.objects) state.setObjects(data.objects)
        if (data.objectInstances) state.setObjectInstances(data.objectInstances)
        if (data.layers) state.setLayers(data.layers)
        if (data.biomes) state.setBiomes(data.biomes)
        if (data.lighting) state.setLighting(data.lighting)
        // Новая архитектура: содержимое слоёв
        if (data.landscapeContent !== undefined) state.setLandscapeContent(data.landscapeContent)
        if (data.waterContent !== undefined) state.setWaterContent(data.waterContent)
        if (data.environmentContent !== undefined) state.setEnvironmentContent(data.environmentContent)
        else state.setEnvironmentContent({ cloudSets: [], wind: { direction: [1,0], speed: 0.2 } })

        // Legacy окружение сцены (ветер): если в новых данных окружения нет ветра — используем старые поля
        if (!data.environmentContent?.wind && data.environment && data.environment.wind) {
          const d = data.environment.wind.direction as [number, number] | undefined
          const s = data.environment.wind.speed as number | undefined
          if (d && Array.isArray(d) && d.length === 2) state.setWind(d as any, typeof s === 'number' ? s : state.environment.wind.speed)
          else if (typeof s === 'number') state.setWindSpeed(s)
        }

        // Set scene metadata
        if (sceneName && sceneUuid) {
          set({
            sceneMetaData: {
              uuid: sceneUuid,
              name: sceneName,
              status: 'saved'
            }
          })
        } else {
          set({
            sceneMetaData: { name: 'Новая сцена', status: 'draft' }
          })
        }

        // Clear history after loading
        set({ history: [], historyIndex: -1 })
      }
    },

    getCurrentSceneData: () => {
      const state = get()
      return {
        objects: state.objects,
        objectInstances: state.objectInstances,
        layers: state.layers,
        lighting: state.lighting,
        biomes: state.biomes,
        // Legacy snapshot
        environment: state.environment,
        // Новая архитектура содержимого
        landscapeContent: state.landscapeContent,
        waterContent: state.waterContent,
        environmentContent: state.environmentContent,
      }
    },

    clearScene: () => {
      set({
        objects: [],
        objectInstances: [],
        layers: initialLayers,
        lighting: initialLighting,
        biomes: [],
        // Legacy окружение (оставляем до завершения миграции рендеров/UI)
        environment: {
          wind: { direction: [1, 0], speed: 0.2 }
        },
        // Новая архитектура содержимого слоёв
        landscapeContent: null,
        waterContent: [],
        environmentContent: { cloudSets: [], wind: { direction: [1,0], speed: 0.2 } },
        selectedObject: null,
        hoveredObject: null,
        sceneMetaData: initialSceneMetaData,
        history: [],
        historyIndex: -1
      })
    },

    // History management
    saveToHistory: () => {
      const state = get()
      const currentData = JSON.stringify(state.getCurrentSceneData())

      // Don't save if it's the same as the last entry
      if (state.history[state.historyIndex] === currentData) return

      // Remove any history after current index (for redo after undo)
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(currentData)

      // Limit history size
      const maxHistorySize = 50
      if (newHistory.length > maxHistorySize) {
        newHistory.shift()
      }

      set({
        history: newHistory,
        historyIndex: newHistory.length - 1
      })
    },

    undo: () => {
      const state = get()
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1
        const previousData = JSON.parse(state.history[newIndex])

        // Load previous state without saving to history
        set({
          ...previousData,
          historyIndex: newIndex,
          history: state.history // Keep original history
        })
      }
    },

    redo: () => {
      const state = get()
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1
        const nextData = JSON.parse(state.history[newIndex])

        // Load next state without saving to history
        set({
          ...nextData,
          historyIndex: newIndex,
          history: state.history // Keep original history
        })
      }
    },

    canUndo: () => {
      return get().historyIndex > 0
    },

    canRedo: () => {
      const state = get()
      return state.historyIndex < state.history.length - 1
    },

  }))
)

// Selectors for optimized subscriptions
export const useSceneObjects = () => useSceneStore(state => state.objects)
export const useSceneObjectInstances = () =>
  useSceneStore(state => state.objectInstances)
export const useSceneLayers = () => useSceneStore(state => state.layers)
export const useSceneBiomes = () => useSceneStore(state => state.biomes)
/**
 * Хук для доступа к настройкам освещения сцены.
 */
export const useSceneLighting = () =>
  useSceneStore(state => state.lighting)
export const useSelectedObject = () => useSceneStore(state => state.selectedObject)
export const useHoveredObject = () => useSceneStore(state => state.hoveredObject)
export const useViewMode = () => useSceneStore(state => state.viewMode)
export const useRenderMode = () => useSceneStore(state => state.renderMode)
export const useTransformMode = () => useSceneStore(state => state.transformMode)
export const useGridVisible = () => useSceneStore(state => state.gridVisible)
/**
 * Хук-селектор видимости хелпера камеры теней DirectionalLight.
 */
export const useShadowCameraHelperVisible = () => useSceneStore(state => state.shadowCameraHelperVisible)
/**
 * Хук-селектор для статуса применения heightmap.
 * Возвращает true, когда террейн применяет высоты и следует показать прелоадер.
 */
export const useIsTerrainApplying = () => useSceneStore(state => state.isTerrainApplying)

/**
 * Хук-селектор для доступа к параметрам ветра окружения сцены.
 * Возвращает объект вида { wind: { direction: [x,z], speed } }.
 */
export const useSceneWind = () => useSceneStore(state => state.environment.wind)

// Global material access helpers (reads from MaterialRegistry)
export const useGlobalMaterials = (): GfxMaterial[] => {
  // This will cause re-renders when materials change, but since it reads from
  // the registry, it should be used sparingly or with proper memoization
  return materialRegistry.getGlobalMaterials()
}
