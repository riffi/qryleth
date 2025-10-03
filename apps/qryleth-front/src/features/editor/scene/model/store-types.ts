/**
 * Scene Store типы
 *
 * Типы для Zustand store управления сценой:
 * - SceneStoreState - состояние store
 * - SceneStoreActions - действия store
 * - SceneStore - комбинированный тип
 */

import type {
  ViewMode,
  RenderMode,
  TransformMode,
  SelectedSceneObject,
  HoveredSceneObject,
  UiMode,
  RenderProfile,
  CameraPose
} from '@/shared/types/ui'
import type { SceneObject, SceneObjectInstance, SceneLayer, SceneMetaData } from '@/entities/scene/types'
import type { GfxBiome } from '@/entities/biome'
import type { LightingSettings } from '@/entities/lighting/model/types'
import type { GfxEnvironmentContent, GfxCloudSet, GfxFogSettings, GfxSkySettings } from '@/entities/environment'
import type { GfxWaterBody } from '@/entities/water'
import type { GfxLandscape } from '@/entities/terrain'


// Scene metadata types вынесены в entities/scene

// Store state interface
export interface SceneStoreState {
  objects: SceneObject[]
  objectInstances: SceneObjectInstance[]
  layers: SceneLayer[]
  /**
   * Биомы сцены: доменные сущности, описывающие области скаттеринга
   * и их параметры генерации. Хранятся независимо от слоёв и объектов.
   */
  biomes: GfxBiome[]
  selectedObject: SelectedSceneObject | null
  hoveredObject: HoveredSceneObject | null
  sceneMetaData: SceneMetaData
  lighting: LightingSettings
  /** Глобальный режим UI страницы редактора: редактирование или просмотр (play). */
  uiMode: UiMode
  /** Профиль рендера: edit/view. Пока используется как флаг без смены настроек. */
  renderProfile: RenderProfile
  viewMode: ViewMode
  renderMode: RenderMode
  transformMode: TransformMode
  gridVisible: boolean
  /**
   * Флаг автопривязки цели OrbitControls к выбранному инстансу.
   *
   * Когда включён — при клике/смене выделения камера автоматически
   * наводится на центр выбранного объекта (target обновляется).
   * Когда выключен — выбор объектов НЕ меняет цель OrbitControls.
   */
  autoOrbitTargetOnSelect: boolean
  /** Текущая сохранённая поза камеры для восстановления при переходах. */
  cameraPose?: CameraPose
  history: any[] // TODO: Define proper history type
  historyIndex: number
  /**
   * Флаг применения карты высот (heightmap) к ландшафту.
   *
   * Когда пользователь выбирает или загружает heightmap, высоты могут
   * подгружаться и подготавливаться асинхронно (из Dexie или через миграцию).
   * На время применения следует блокировать UI рендера оверлеем, чтобы избежать
   * мерцаний и частично применённого состояния.
   */
  isTerrainApplying: boolean

  /**
   * Флаг видимости хелпера камеры теней направленного света.
   *
   * Когда включён — в сцене отображается THREE.CameraHelper для теневой
   * ортографической камеры DirectionalLight. Полезно для настройки границ
   * области теней и отладки смещений/bias.
   */
  shadowCameraHelperVisible: boolean

  /**
   * Глобальные настройки LOD деревьев и сегментации инстансов по чанкам.
   *
   * enabled — включает/выключает логику LOD (near/far/billboard);
   * nearInPx/nearOutPx/farInPx/farOutPx — экранно‑пространственные пороги в пикселях;
   * leafChunkSize/trunkChunkSize — размеры чанков для агрегаторов листвы/стволов.
   */
  lodConfig: {
    enabled: boolean
    nearInPx: number
    nearOutPx: number
    farInPx: number
    farOutPx: number
    leafChunkSize: number
    trunkChunkSize: number
  }

  /**
   * Настройки LOD для травы (отдельно от деревьев).
   * Пороговые значения такие же по смыслу, но применяются к пучкам травы.
   */
  grassLodConfig: {
    enabled: boolean
    nearInPx: number
    nearOutPx: number
    /** Размер чанка для агрегаторов травы (м) */
    chunkSize: number
    /** Сдвиг плоскостей трипланара вдоль нормали (м) */
    offset: number
  }

  /**
   * Параметры окружения сцены.
   * На текущем этапе содержит глобальный ветер для анимации дрейфа облаков и других эффектов.
   */
  environment: {
    /**
     * Глобальный ветер: нормализованное направление в плоскости XZ.
     * Вектор хранится как [x, z] с длиной 1 (нормализуется при установке).
     */
    wind: {
      /** Нормализованное направление ветра в плоскости XZ */
      direction: [number, number]
      /** Скорость ветра в единицах мира в секунду (неотрицательная) */
      speed: number
    }
  }

  /**
   * Содержимое ландшафтного слоя (новая архитектура):
   * единый контейнер, привязанный к единственному слою типа 'landscape'.
   */
  landscapeContent?: { layerId: string; items: GfxLandscape[] } | null

  /**
   * Содержимое водных слоёв (новая архитектура): массив контейнеров,
   * каждый привязан к конкретному водному слою через layerId.
   */
  waterContent?: Array<{ layerId: string; items: GfxWaterBody[] }>

  /**
   * Содержимое окружения (новая архитектура): единственный контейнер,
   * привязанный к слою типа 'environment' (ветер, небо, туман, экспозиция, наборы облаков).
   */
  environmentContent: GfxEnvironmentContent
}

// Store actions interface
export interface SceneStoreActions {
  // Object management
  setObjects: (objects: SceneObject[]) => void
  addObject: (object: SceneObject) => void
  removeObject: (uuid: string) => void
  updateObject: (uuid: string, updates: Partial<SceneObject>) => void

  // Instance management
  setObjectInstances: (objectInstances: SceneObjectInstance[]) => void
  addObjectInstance: (instance: SceneObjectInstance) => void
  removeObjectInstance: (index: number) => void
  /**
   * Обновить параметры инстанса по его UUID
   *
   * @param instanceId - идентификатор инстанса
   * @param updates - частичное обновление свойств
   */
  updateObjectInstance: (
    instanceId: string,
    updates: Partial<SceneObjectInstance>
  ) => void

  // Biomes management
  /**
   * Полностью заменить список биомов сцены.
   * Предполагается использование при загрузке сцены или массовых изменениях.
   */
  setBiomes: (biomes: GfxBiome[]) => void
  /**
   * Добавить один биом в сцену.
   */
  addBiome: (biome: GfxBiome) => void
  /**
   * Обновить биом по его UUID частичным набором полей.
   */
  updateBiome: (biomeUuid: string, updates: Partial<GfxBiome>) => void
  /**
   * Удалить биом по UUID.
   */
  removeBiome: (biomeUuid: string) => void

  // Layer management
  setLayers: (layers: SceneLayer[]) => void
  createLayer: (layer: Omit<SceneLayer, 'id'>) => void
  updateLayer: (layerId: string, updates: Partial<SceneLayer>) => void
  deleteLayer: (layerId: string) => void
  toggleLayerVisibility: (layerId: string) => void
  moveObjectToLayer: (objectUuid: string, layerId: string) => void

  // Selection
  selectObject: (objectUuid: string, instanceId?: string, isInstanced?: boolean) => void
  clearSelection: () => void
  setHoveredObject: (objectUuid: string, instanceId?: string) => void
  clearHover: () => void

  // Scene state
  setSceneMetadata: (metadata: SceneMetaData) => void
  markSceneAsModified: () => void
  setLighting: (lighting: LightingSettings) => void
  updateLighting: (updates: Partial<LightingSettings>) => void
  /**
   * Установить глобальный режим UI страницы редактора.
   * Используется для переключения между режимами 'редактирование' и 'play'.
   */
  setUiMode: (mode: UiMode) => void
  /**
   * Переключить play-режим (Edit ↔ Play) без пересоздания сцены.
   * Меняет только флаги uiMode/renderProfile; ответственность за UI — на уровне компонентов.
   */
  togglePlay: () => void
  /**
   * Установить профиль рендера (edit/view). На текущем этапе используется как флаг.
   */
  setRenderProfile: (profile: RenderProfile) => void
  setViewMode: (mode: ViewMode) => void
  setRenderMode: (mode: RenderMode) => void
  setTransformMode: (mode: TransformMode) => void
  toggleGridVisibility: () => void
  /**
   * Переключить автопривязку цели камеры (OrbitControls) к выбранному инстансу.
   *
   * Включение приводит к тому, что при последующих выборах объектов target
   * будет автоматически устанавливаться в центр их bounding box.
   */
  toggleAutoOrbitTargetOnSelect: () => void
  /**
   * Явно установить состояние автопривязки цели камеры.
   *
   * @param enabled - true для включения автопривязки, false для выключения.
   */
  setAutoOrbitTargetOnSelect: (enabled: boolean) => void
  /**
   * Сохранить текущую позу камеры для последующего восстановления.
   * Поза включает позицию и опционально цель (для Orbit) и ориентацию (для Walk/Fly).
   */
  saveCameraPose: (pose: CameraPose) => void
  /**
   * Восстановить ранее сохранённую позу камеры.
   * Возвращает сохранённую позу, если она была сохранена; иначе undefined.
   */
  restoreCameraPose: () => CameraPose | undefined

  // Visibility
  toggleObjectVisibility: (objectUuid: string) => void
  toggleInstanceVisibility: (objectUuid: string, instanceId: string) => void

  // Scene data management
  getCurrentSceneData: () => {
    objects: SceneObject[]
    objectInstances: SceneObjectInstance[]
    layers: SceneLayer[]
    lighting: LightingSettings
    biomes: GfxBiome[]
  }
  clearScene: () => void
  loadSceneData: (data: any, sceneName?: string, sceneUuid?: string) => void

  // History
  saveToHistory: () => void
  undo: () => void
  redo: () => void

  // LOD management
  /**
   * Включить/выключить систему LOD деревьев на сцене.
   * @param enabled true — LOD активен; false — всё рендерится в near.
   */
  setLodEnabled: (enabled: boolean) => void
  /**
   * Обновить размеры чанков для инстанс‑агрегаторов.
   * @param opts.partial partial с полями leafChunkSize/trunkChunkSize
   */
  setLodChunkSizes: (opts: Partial<{ leafChunkSize: number; trunkChunkSize: number }>) => void
  /**
   * Установить экранные пороги LOD в пикселях.
   * Пороговые окна должны удовлетворять nearInPx > nearOutPx >= farInPx > farOutPx.
   */
  setTreeLodThresholds: (thresholds: Partial<{ nearInPx: number; nearOutPx: number; farInPx: number; farOutPx: number }>) => void
  canUndo: () => boolean
  canRedo: () => boolean

  /**
   * Установить флаг начала применения heightmap.
   *
   * Вызывается перед началом потенциально долгой загрузки/миграции данных
   * высот. В UI на этот период показывается `LoadingOverlay` поверх канваса
   * Scene3D. Повторные вызовы допускаются — флаг просто остаётся включённым.
   */
  startTerrainApplying: () => void

  /**
   * Сбросить флаг применения heightmap после завершения загрузки/миграции.
   *
   * Вызывается из обработчика `onHeightmapLoaded` в рендер-слое или из места,
   * где стало достоверно известно, что высоты доступны (включая путь с кэшем).
   */
  finishTerrainApplying: () => void

  /**
   * Явно установить видимость хелпера камеры теней DirectionalLight.
   *
   * @param visible - true, чтобы показать хелпер; false, чтобы скрыть.
   */
  setShadowCameraHelperVisible: (visible: boolean) => void

  /**
   * Переключить видимость хелпера камеры теней DirectionalLight.
   * Удобно привязывать к UI-кнопке-тумблеру в панели настроек света.
   */
  toggleShadowCameraHelperVisible: () => void

  // Environment: Wind controls
  /**
   * Установить глобальные параметры ветра сцены.
   *
   * Компоненты рендера (например, облака) могут использовать эти значения
   * для анимации дрейфа. Направление автоматически нормализуется (длина=1).
   * Если передана скорость < 0 — она принудительно ставится в 0.
   *
   * @param direction Вектор направления в плоскости XZ: [x, z]
   * @param speed Скорость ветра в юнитах/сек; отрицательные значения приводятся к 0
   */
  setWind: (direction: [number, number], speed: number) => void

  /**
   * Установить только направление ветра.
   * Значение нормализуется до длины 1; если вектор нулевой — устанавливается [1, 0].
   *
   * @param direction Вектор направления [x, z]
   */
  setWindDirection: (direction: [number, number]) => void

  /**
   * Установить только скорость ветра (неотрицательная).
   * Отрицательные значения приводятся к 0.
   *
   * @param speed Скорость ветра (юниты/сек)
   */
  setWindSpeed: (speed: number) => void

  // Environment content (new architecture)
  /** Полностью заменить контейнер окружения (или сбросить в null). */
  setEnvironmentContent: (content: GfxEnvironmentContent) => void
  /** Добавить набор облаков в окружение. */
  addCloudSet: (set: GfxCloudSet) => void
  /** Обновить набор облаков по его ID. */
  updateCloudSet: (setId: string, updates: Partial<GfxCloudSet>) => void
  /** Удалить набор облаков по его ID. */
  removeCloudSet: (setId: string) => void
  /** Установить/обновить параметры ветра окружения. */
  setEnvWind: (direction: [number, number], speed: number) => void
  /** Установить только направление ветра окружения. */
  setEnvWindDirection: (direction: [number, number]) => void
  /** Установить только скорость ветра окружения. */
  setEnvWindSpeed: (speed: number) => void
  /** Установить/обновить параметры неба окружения. */
  setEnvSky: (sky: Partial<GfxSkySettings>) => void
  /** Установить/обновить параметры тумана окружения. */
  setEnvFog: (fog: Partial<GfxFogSettings>) => void
  /** Установить экспозицию окружения. */
  setEnvExposure: (exposure: number) => void

  // Landscape content (new architecture)
  /** Полностью заменить контейнер ландшафта или сбросить в null. */
  setLandscapeContent: (content: { layerId: string; items: GfxLandscape[] } | null) => void
  /** Установить/сменить привязанный слой ландшафта. */
  setLandscapeLayer: (layerId: string) => void
  /** Добавить ландшафтную площадку. */
  addLandscapeItem: (item: GfxLandscape) => void
  /** Обновить ландшафтную площадку по её ID. */
  updateLandscapeItem: (id: string, updates: Partial<GfxLandscape>) => void
  /** Удалить ландшафтную площадку по её ID. */
  removeLandscapeItem: (id: string) => void

  // Water content (new architecture)
  /** Полностью заменить список контейнеров воды. */
  setWaterContent: (containers: Array<{ layerId: string; items: GfxWaterBody[] }>) => void
  /** Добавить водоём в контейнер указанного слоя (создаёт контейнер при отсутствии). */
  addWaterBody: (layerId: string, body: GfxWaterBody) => void
  /** Обновить водоём по ID в контейнере слоя. */
  updateWaterBody: (layerId: string, bodyId: string, updates: Partial<GfxWaterBody>) => void
  /** Удалить водоём по ID из контейнера слоя. */
  removeWaterBody: (layerId: string, bodyId: string) => void
}

// Combined store type
export type SceneStore = SceneStoreState & SceneStoreActions
