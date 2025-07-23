import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { GfxPrimitive } from '@/entities/primitive'
import { normalizePrimitive } from '@/entities/primitive'
import type { RenderMode, TransformMode, ViewMode } from '@/shared/types/ui'
import type {LightingSettings} from "@/entities/lighting/model/types.ts";

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

    // Устанавливает список примитивов, приводя их к нормализованному виду
    setPrimitives: (primitives: GfxPrimitive[]) =>
      set({ primitives: primitives.map(normalizePrimitive) }),
    // Добавляет новый примитив в хранилище
    addPrimitive: (primitive: GfxPrimitive) =>
      set(state => ({
        primitives: [...state.primitives, normalizePrimitive(primitive)]
      })),
    // Обновляет примитив по индексу
    updatePrimitive: (index: number, updates: Partial<GfxPrimitive>) =>
      set(state => ({ primitives: state.primitives.map((p, i) => (i === index ? { ...p, ...updates } : p)) })),
    // Заменяет настройки освещения
    setLighting: (lighting: LightingSettings) => set({ lighting }),
    // Меняет режим отображения
    setRenderMode: (mode: RenderMode) => set({ renderMode: mode }),
    // Устанавливает активный режим трансформации
    setTransformMode: (mode: TransformMode) => set({ transformMode: mode }),
    // Выбирает примитив по индексу
    selectPrimitive: (index: number) => set({ selectedPrimitiveId: index }),
    // Записывает ID наведённого примитива
    setHoveredPrimitive: (index: number | null) => set({ hoveredPrimitiveId: index }),
    // Снимает выделение
    clearSelection: () => set({ selectedPrimitiveId: null }),
    // Очищает сцену и сбрасывает освещение
    clearScene: () =>
      set({ primitives: [], lighting: initialLighting, selectedPrimitiveId: null, hoveredPrimitiveId: null })
  }))
)

// Селекторы состояния стора объекта
export const useObjectPrimitives = () => useObjectStore(s => s.primitives)
export const useObjectLighting = () => useObjectStore(s => s.lighting)
export const useObjectSelectedPrimitiveId = () => useObjectStore(s => s.selectedPrimitiveId)
export const useObjectHoveredPrimitiveId = () => useObjectStore(s => s.hoveredPrimitiveId)
export const useObjectRenderMode = () => useObjectStore(s => s.renderMode)
export const useObjectTransformMode = () => useObjectStore(s => s.transformMode)
export const useObjectViewMode = () => useObjectStore(s => s.viewMode)
