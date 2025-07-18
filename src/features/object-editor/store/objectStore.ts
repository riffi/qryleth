import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { SceneObject, SceneObjectInstance, SceneLayer, LightingSettings } from '../../../entities/scene/types'
import type {RenderMode, SelectedObject, TransformMode, ViewMode} from '../../../entities/r3f/types'

interface ObjectStoreState {
  objects: SceneObject[]
  placements: SceneObjectInstance[]
  layers: SceneLayer[]
  lighting: LightingSettings
  viewMode: ViewMode
  renderMode: RenderMode
  transformMode: TransformMode
  selectedObject: SelectedObject | null
  hoveredObject: SelectedObject | null
}

interface ObjectStoreActions {
  setObjects: (objects: SceneObject[]) => void
  addObject: (object: SceneObject) => void
  setPlacements: (placements: SceneObjectInstance[]) => void
  addPlacement: (placement: SceneObjectInstance) => void
  updatePlacement: (index: number, updates: Partial<SceneObjectInstance>) => void
  setLayers: (layers: SceneLayer[]) => void
  setLighting: (lighting: LightingSettings) => void
  setRenderMode: (mode: RenderMode) => void
  setTransformMode: (mode: TransformMode) => void
  selectObject: (objectIndex: number, instanceId?: string) => void
  clearSelection: () => void
  clearScene: () => void
}

export type ObjectStore = ObjectStoreState & ObjectStoreActions

const initialLighting: LightingSettings = {
  ambientColor: '#404040',
  ambientIntensity: 0.6,
  directionalColor: '#ffffff',
  directionalIntensity: 1,
  backgroundColor: '#222222'
}

const initialLayers: SceneLayer[] = [
  {
    id: 'objects',
    name: 'Объекты',
    type: 'object',
    visible: true,
    position: 0
  }
]

export const useObjectStore = create<ObjectStore>()(
  subscribeWithSelector((set, get) => ({
    objects: [],
    placements: [],
    layers: initialLayers,
    lighting: initialLighting,
    viewMode: 'orbit',
    renderMode: 'solid',
    transformMode: 'translate',
    selectedObject: null,
    hoveredObject: null,

    setObjects: (objects: SceneObject[]) => set({ objects }),
    addObject: (object: SceneObject) =>
      set(state => ({ objects: [...state.objects, { ...object, visible: object.visible !== false }] })),
    setPlacements: (placements: SceneObjectInstance[]) => set({ placements }),
    addPlacement: (placement: SceneObjectInstance) =>
      set(state => ({ placements: [...state.placements, placement] })),
    updatePlacement: (index: number, updates: Partial<SceneObjectInstance>) =>
      set(state => ({ placements: state.placements.map((p, i) => (i === index ? { ...p, ...updates } : p)) })),
    setLayers: (layers: SceneLayer[]) => set({ layers }),
    setLighting: (lighting: LightingSettings) => set({ lighting }),
    setRenderMode: (mode: 'solid' | 'wireframe') => set({ renderMode: mode }),
    setTransformMode: (mode: TransformMode) => set({ transformMode: mode }),
    selectObject: (objectIndex: number, instanceId?: string) =>
      set({ selectedObject: { objectIndex, instanceId, placementIndex: instanceId ? parseInt(instanceId.split('-')[1]) : undefined } }),
    clearSelection: () => set({ selectedObject: null }),
    clearScene: () =>
      set({ objects: [], placements: [], layers: initialLayers, lighting: initialLighting, selectedObject: null, hoveredObject: null })
  }))
)

// Selectors
export const useObjectObjects = () => useObjectStore(s => s.objects)
export const useObjectPlacements = () => useObjectStore(s => s.placements)
export const useObjectLayers = () => useObjectStore(s => s.layers)
export const useObjectLighting = () => useObjectStore(s => s.lighting)
export const useObjectSelected = () => useObjectStore(s => s.selectedObject)
export const useObjectHovered = () => useObjectStore(s => s.hoveredObject)
export const useObjectRenderMode = () => useObjectStore(s => s.renderMode)
export const useObjectTransformMode = () => useObjectStore(s => s.transformMode)
export const useObjectViewMode = () => useObjectStore(s => s.viewMode)
