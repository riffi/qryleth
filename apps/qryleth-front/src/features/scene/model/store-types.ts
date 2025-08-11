/**
 * Scene Store типы
 *
 * Типы для Zustand store управления сценой:
 * - SceneStoreState - состояние store
 * - SceneStoreActions - действия store
 * - SceneStore - комбинированный тип
 */

import type { ViewMode, RenderMode, TransformMode, SelectedSceneObject, HoveredSceneObject } from '@/shared/types/ui'
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
  viewMode: ViewMode
  renderMode: RenderMode
  transformMode: TransformMode
  gridVisible: boolean
  history: any[] // TODO: Define proper history type
  historyIndex: number
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
  setViewMode: (mode: ViewMode) => void
  setRenderMode: (mode: RenderMode) => void
  setTransformMode: (mode: TransformMode) => void
  toggleGridVisibility: () => void

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
}

// Combined store type
export type SceneStore = SceneStoreState & SceneStoreActions
