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
import type { SceneObject, SceneObjectInstance, SceneLayer } from '@/entities/scene/types'
import type { LightingSettings } from '@/entities/lighting/model/types'


// Scene metadata types
export type SceneStatus = 'draft' | 'saved' | 'modified'

export interface SceneMetaData {
  uuid?: string
  name: string
  status: SceneStatus
}

// Store state interface
export interface SceneStoreState {
  objects: SceneObject[]
  objectInstances: SceneObjectInstance[]
  layers: SceneLayer[]
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
  }
  clearScene: () => void
  loadSceneData: (data: any, sceneName?: string, sceneUuid?: string) => void

  // History
  saveToHistory: () => void
  undo: () => void
  redo: () => void
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
}

// Combined store type
export type SceneStore = SceneStoreState & SceneStoreActions
