
import type {GfxPrimitive} from "../primitive";
import type {Vector3} from "../../shared/types/vector3.ts";
import type {LightingSettings, SceneLayer, SceneObject, SceneObjectInstance} from "../scene/types.ts";



// Selection state for R3F
export interface SelectedObject {
  objectUuid: string
  instanceId?: string
  placementIndex?: number
}

export interface HoveredObject {
  objectUuid: string
  instanceId?: string
  placementIndex?: number
}

// View modes for camera controls
export type ViewMode = 'orbit' | 'walk' | 'fly'
export type RenderMode = 'solid' | 'wireframe'
export type TransformMode = 'translate' | 'rotate' | 'scale'

// Scene status
export type SceneStatus = 'draft' | 'saved' | 'modified'

export interface CurrentScene {
  uuid?: string
  name: string
  status: SceneStatus
}


// Scene interaction events
export interface SceneClickEvent {
  objectUuid?: string
  instanceId?: string
  placementIndex?: number
  point: Vector3
  object?: THREE.Object3D
}

export interface SceneHoverEvent {
  objectUuid?: string
  instanceId?: string
  placementIndex?: number
  object?: THREE.Object3D
}

// Transform events
export interface ObjectTransformEvent {
  objectUuid: string
  instanceId?: string
  placementIndex?: number
  position: Vector3
  rotation: Vector3
  scale: Vector3
}

export interface PrimitiveTransformEvent {
  primitiveIndex?: number
  position: Vector3
  rotation: Vector3
  scale: Vector3
}


export interface CompositeObjectProps {
  sceneObject: SceneObject
  instance: SceneObjectInstance
  instanceIndex: number
  isSelected?: boolean
  isHovered?: boolean
  renderMode?: RenderMode
  visible?: boolean
  onClick?: (event: SceneClickEvent) => void
  onHover?: (event: SceneHoverEvent) => void
  onTransform?: (event: ObjectTransformEvent) => void
}

export interface PrimitiveRendererProps {
  primitive: GfxPrimitive
  renderMode?: RenderMode
  userData?: any
}

export interface LandscapeLayerProps {
  layer: SceneLayer
}


export interface ObjectTransformGizmoProps {
  selectedObject?: SelectedObject
  transformMode: TransformMode
  onTransform?: (event: ObjectTransformEvent) => void
}

export interface PrimitiveTransformGizmoProps {
  selectedPrimitive?: SelectedObject
  transformMode: TransformMode
  onTransform?: (event: PrimitiveTransformEvent) => void
}

export interface PostProcessingProps {
  selectedObjects: THREE.Object3D[]
  hoveredObjects: THREE.Object3D[]
}

// Store interfaces
export interface SceneStoreState {
  // Scene data
  objects: SceneObject[]
  placements: SceneObjectInstance[]
  layers: SceneLayer[]
  lighting: LightingSettings

  // UI state
  viewMode: ViewMode
  renderMode: RenderMode
  transformMode: TransformMode
  selectedObject: SelectedObject | null
  hoveredObject: HoveredObject | null
  gridVisible: boolean

  // Scene metadata
  currentScene: CurrentScene

  // History
  history: string[]
  historyIndex: number
}

export interface SceneStoreActions {
  // Object management
  setObjects: (objects: SceneObject[]) => void
  addObject: (object: SceneObject) => void
  removeObject: (objectUuid: string) => void
  updateObject: (objectUuid: string, updates: Partial<SceneObject>) => void

  // Placement management
  setPlacements: (placements: ScenePlacement[]) => void
  addPlacement: (placement: ScenePlacement) => void
  updatePlacement: (index: number, updates: Partial<ScenePlacement>) => void
  removePlacement: (index: number) => void

  // Layer management
  setLayers: (layers: SceneLayer[]) => void
  createLayer: (layer: Omit<SceneLayer, 'id'>) => void
  updateLayer: (layerId: string, updates: Partial<SceneLayer>) => void
  deleteLayer: (layerId: string) => void
  toggleLayerVisibility: (layerId: string) => void
  toggleObjectVisibility: (objectUuid: string) => void
  /** Toggle visibility of a specific object instance */
  toggleInstanceVisibility: (objectUuid: string, instanceId: string) => void
  moveObjectToLayer: (objectUuid: string, layerId: string) => void

  // Lighting
  setLighting: (lighting: LightingSettings) => void
  updateLighting: (updates: Partial<LightingSettings>) => void

  // Selection
  selectObject: (objectUuid: string, instanceId?: string) => void
  clearSelection: () => void
  setHoveredObject: (objectUuid: string, instanceId?: string) => void
  clearHover: () => void

  // View controls
  setViewMode: (mode: ViewMode) => void
  setRenderMode: (mode: RenderMode) => void
  setTransformMode: (mode: TransformMode) => void
  toggleGridVisibility: () => void

  // Scene management
  setCurrentScene: (scene: CurrentScene) => void
  markSceneAsModified: () => void
  loadSceneData: (data: any, sceneName?: string, sceneUuid?: string) => void
  getCurrentSceneData: () => any
  clearScene: () => void

  // History
  saveToHistory: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

export type SceneStore = SceneStoreState & SceneStoreActions


// Utility types for hooks
export interface UseSceneEventsReturn {
  handleClick: (event: any) => void
  handlePointerOver: (event: any) => void
  handlePointerOut: (event: any) => void
}

export interface UseObjectSelectionReturn {
  selectedObjects: THREE.Object3D[]
  hoveredObjects: THREE.Object3D[]
  isSelected: (objectUuid: string, instanceId?: string) => boolean
  isHovered: (objectUuid: string, instanceId?: string) => boolean
}

export interface UsePrimitiveSelectionReturn {
  selectedObjects: THREE.Object3D[]
  hoveredObjects: THREE.Object3D[]
  isSelected: (index: number) => boolean
  isHovered: (index: number) => boolean
}


export interface UseSceneHistoryReturn {
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  saveToHistory: () => void
}

