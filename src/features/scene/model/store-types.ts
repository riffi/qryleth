/**
 * Scene Store типы
 * 
 * Типы для Zustand store управления сценой:
 * - SceneStoreState - состояние store
 * - SceneStoreActions - действия store
 * - SceneStore - комбинированный тип
 */

import type { Vector3 } from '@/shared/types/core'
import type { ViewMode, RenderMode, SelectedObject, HoveredObject } from '@/shared/types/ui'
import type { SceneObject, SceneObjectInstance, SceneLayer } from '@/entities/scene/types'
import type { LightingSettings } from '@/entities/lighting/model/types'
import type { GfxObject } from '@/entities/object/model/types'

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
  selectedObject: SelectedObject | null
  hoveredObject: HoveredObject | null
  sceneMetaData: SceneMetaData
  lighting: LightingSettings
  viewMode: ViewMode
  renderMode: RenderMode
  history: any[] // TODO: Define proper history type
  historyIndex: number
}

// Store actions interface  
export interface SceneStoreActions {
  // Object management
  addObject: (object: GfxObject) => void
  removeObject: (uuid: string) => void
  updateObject: (uuid: string, updates: Partial<GfxObject>) => void
  
  // Instance management
  addObjectInstance: (instance: Omit<SceneObjectInstance, 'uuid'>) => void
  removeObjectInstance: (index: number) => void
  updateObjectInstance: (index: number, updates: Partial<SceneObjectInstance>) => void
  
  // Layer management
  createLayer: (layer: Omit<SceneLayer, 'id'>) => void
  updateLayer: (layerId: string, updates: Partial<SceneLayer>) => void
  deleteLayer: (layerId: string) => void
  toggleLayerVisibility: (layerId: string) => void
  moveObjectToLayer: (objectUuid: string, layerId: string) => void
  
  // Selection
  selectObject: (objectUuid: string, instanceId?: string) => void
  clearSelection: () => void
  setHoveredObject: (objectUuid: string, instanceId?: string) => void
  clearHover: () => void
  
  // Scene state
  updateSceneMetaData: (metadata: Partial<SceneMetaData>) => void
  updateLighting: (lighting: LightingSettings) => void
  setViewMode: (mode: ViewMode) => void
  setRenderMode: (mode: RenderMode) => void
  
  // Visibility
  toggleObjectVisibility: (objectUuid: string) => void
  toggleInstanceVisibility: (objectUuid: string, instanceId: string) => void
  
  // History
  saveToHistory: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

// Combined store type
export type SceneStore = SceneStoreState & SceneStoreActions