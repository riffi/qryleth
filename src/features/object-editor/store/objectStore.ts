import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { GfxPrimitive } from '@/entities/primitive'
import { normalizePrimitive } from '@/entities/primitive'
import type { LightingSettings } from '@/entities/scene/types.ts'
import type { RenderMode, TransformMode, ViewMode } from '@/entities/r3f/types.ts'

interface ObjectStoreState {
  primitives: GfxPrimitive[]
  lighting: LightingSettings
  viewMode: ViewMode
  renderMode: RenderMode
  transformMode: TransformMode
  selectedPrimitiveId: number | null
  hoveredPrimitiveId: number | null
}

interface ObjectStoreActions {
  setPrimitives: (primitives: GfxPrimitive[]) => void
  addPrimitive: (primitive: GfxPrimitive) => void
  updatePrimitive: (index: number, updates: Partial<GfxPrimitive>) => void
  setLighting: (lighting: LightingSettings) => void
  setRenderMode: (mode: RenderMode) => void
  setTransformMode: (mode: TransformMode) => void
  selectPrimitive: (index: number) => void
  setHoveredPrimitive: (index: number | null) => void
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

export const useObjectStore = create<ObjectStore>()(
  subscribeWithSelector((set, get) => ({
    primitives: [],
    lighting: initialLighting,
    viewMode: 'orbit',
    renderMode: 'solid',
    transformMode: 'translate',
    selectedPrimitiveId: null,
    hoveredPrimitiveId: null,

    setPrimitives: (primitives: GfxPrimitive[]) =>
      set({ primitives: primitives.map(normalizePrimitive) }),
    addPrimitive: (primitive: GfxPrimitive) =>
      set(state => ({
        primitives: [...state.primitives, normalizePrimitive(primitive)]
      })),
    updatePrimitive: (index: number, updates: Partial<GfxPrimitive>) =>
      set(state => ({ primitives: state.primitives.map((p, i) => (i === index ? { ...p, ...updates } : p)) })),
    setLighting: (lighting: LightingSettings) => set({ lighting }),
    setRenderMode: (mode: RenderMode) => set({ renderMode: mode }),
    setTransformMode: (mode: TransformMode) => set({ transformMode: mode }),
    selectPrimitive: (index: number) => set({ selectedPrimitiveId: index }),
    setHoveredPrimitive: (index: number | null) => set({ hoveredPrimitiveId: index }),
    clearSelection: () => set({ selectedPrimitiveId: null }),
    clearScene: () =>
      set({ primitives: [], lighting: initialLighting, selectedPrimitiveId: null, hoveredPrimitiveId: null })
  }))
)

// Selectors
export const useObjectPrimitives = () => useObjectStore(s => s.primitives)
export const useObjectLighting = () => useObjectStore(s => s.lighting)
export const useObjectSelectedPrimitiveId = () => useObjectStore(s => s.selectedPrimitiveId)
export const useObjectHoveredPrimitiveId = () => useObjectStore(s => s.hoveredPrimitiveId)
export const useObjectRenderMode = () => useObjectStore(s => s.renderMode)
export const useObjectTransformMode = () => useObjectStore(s => s.transformMode)
export const useObjectViewMode = () => useObjectStore(s => s.viewMode)
