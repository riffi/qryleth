import type { Vector3, SceneObject, ScenePlacement, SceneLayer, LightingSettings } from './scene'

// R3F specific type extensions
export interface R3FSceneObject extends SceneObject {
  instances?: R3FObjectInstance[]
}

export interface R3FObjectInstance {
  id: string
  placement: ScenePlacement
  visible: boolean
  selected: boolean
  hovered: boolean
}

// Selection state for R3F
export interface SelectedObject {
  objectIndex: number
  instanceId?: string
  placementIndex?: number
}

export interface HoveredObject {
  objectIndex: number
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

// Camera state
export interface CameraState {
  position: Vector3
  target: Vector3
  viewMode: ViewMode
}

// Scene interaction events
export interface SceneClickEvent {
  objectIndex?: number
  instanceId?: string
  placementIndex?: number
  point: Vector3
  object?: THREE.Object3D
}

export interface SceneHoverEvent {
  objectIndex?: number
  instanceId?: string
  placementIndex?: number
  object?: THREE.Object3D
}

// Transform events
export interface TransformEvent {
  objectIndex: number
  instanceId?: string
  placementIndex?: number
  position: Vector3
  rotation: Vector3
  scale: Vector3
}

// R3F component props
export interface Scene3DProps {
  className?: string
  onSceneReady?: () => void
}

export interface CompositeObjectProps {
  sceneObject: SceneObject
  placement: ScenePlacement
  placementIndex: number
  isSelected?: boolean
  isHovered?: boolean
  renderMode?: RenderMode
  visible?: boolean
  onClick?: (event: SceneClickEvent) => void
  onHover?: (event: SceneHoverEvent) => void
  onTransform?: (event: TransformEvent) => void
}

export interface PrimitiveRendererProps {
  primitive: import('./scene').ScenePrimitive
  renderMode?: RenderMode
}

export interface LandscapeLayerProps {
  layer: SceneLayer
}

export interface CameraControlsProps {
  viewMode: ViewMode
  onViewModeChange?: (mode: ViewMode) => void
}

export interface TransformGizmoProps {
  selectedObject?: SelectedObject
  transformMode: TransformMode
  onTransform?: (event: TransformEvent) => void
}

export interface PostProcessingProps {
  selectedObjects: THREE.Object3D[]
  hoveredObjects: THREE.Object3D[]
}

// Store interfaces
export interface SceneStoreState {
  // Scene data
  objects: SceneObject[]
  placements: ScenePlacement[]
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
  removeObject: (objectIndex: number) => void
  updateObject: (objectIndex: number, updates: Partial<SceneObject>) => void
  
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
  toggleObjectVisibility: (objectIndex: number) => void
  moveObjectToLayer: (objectIndex: number, layerId: string) => void
  
  // Lighting
  setLighting: (lighting: LightingSettings) => void
  updateLighting: (updates: Partial<LightingSettings>) => void
  
  // Selection
  selectObject: (objectIndex: number, instanceId?: string) => void
  clearSelection: () => void
  setHoveredObject: (objectIndex: number, instanceId?: string) => void
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

// Camera store
export interface CameraStoreState {
  position: Vector3
  target: Vector3
  viewMode: ViewMode
}

export interface CameraStoreActions {
  setPosition: (position: Vector3) => void
  setTarget: (target: Vector3) => void
  setViewMode: (mode: ViewMode) => void
  resetCamera: () => void
}

export type CameraStore = CameraStoreState & CameraStoreActions

// Utility types for hooks
export interface UseSceneEventsReturn {
  handleClick: (event: any) => void
  handlePointerOver: (event: any) => void
  handlePointerOut: (event: any) => void
}

export interface UseObjectSelectionReturn {
  selectedObjects: THREE.Object3D[]
  hoveredObjects: THREE.Object3D[]
  isSelected: (objectIndex: number, instanceId?: string) => boolean
  isHovered: (objectIndex: number, instanceId?: string) => boolean
}

export interface UseSceneHistoryReturn {
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  saveToHistory: () => void
}

// Migration feature flag
export interface MigrationFlags {
  USE_R3F_RENDERER: boolean
  USE_R3F_LIGHTING: boolean
  USE_R3F_OBJECTS: boolean
  USE_R3F_CONTROLS: boolean
  USE_R3F_POSTPROCESSING: boolean
}
