import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { GfxPrimitive } from '@/entities/primitive'
import { normalizePrimitive, ensurePrimitiveNames } from '@/entities/primitive'
import type { RenderMode, TransformMode, ViewMode } from '@/shared/types/ui'
import type { LightingSettings } from '@/entities/lighting/model/types.ts'
import type { BoundingBox } from '@/shared/types'
import { calculateObjectBoundingBox } from '@/shared/lib/geometry/boundingBoxUtils'

interface ObjectStoreState {
  primitives: GfxPrimitive[]
  lighting: LightingSettings
  /** Текущий BoundingBox объекта */
  boundingBox?: BoundingBox
  viewMode: ViewMode
  renderMode: RenderMode
  transformMode: TransformMode
  /** Показана ли сетка в редакторе */
  gridVisible: boolean
  selectedPrimitiveIds: number[]
  hoveredPrimitiveId: number | null
}

interface ObjectStoreActions {
  setPrimitives: (primitives: GfxPrimitive[]) => void
  addPrimitive: (primitive: GfxPrimitive) => void
  updatePrimitive: (index: number, updates: Partial<GfxPrimitive>) => void
  setLighting: (lighting: LightingSettings) => void
  setRenderMode: (mode: RenderMode) => void
  setTransformMode: (mode: TransformMode) => void
  /** Переключает видимость сетки */
  toggleGridVisibility: () => void
  selectPrimitive: (index: number) => void
  togglePrimitiveSelection: (index: number) => void
  setSelectedPrimitives: (indices: number[]) => void
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
    boundingBox: undefined,
    viewMode: 'orbit',
    renderMode: 'solid',
    transformMode: 'translate',
    gridVisible: true,
    selectedPrimitiveIds: [],
    hoveredPrimitiveId: null,

    // Устанавливает список примитивов, нормализуя их
    // и заполняя отсутствующие имена
    setPrimitives: (primitives: GfxPrimitive[]) =>
      set(() => {
        const list = ensurePrimitiveNames(primitives.map(normalizePrimitive))
        return {
          primitives: list,
          boundingBox: list.length
            ? calculateObjectBoundingBox({ uuid: '', name: '', primitives: list })
            : undefined
        }
      }),
    // Добавляет новый примитив в хранилище
    addPrimitive: (primitive: GfxPrimitive) =>
      set(state => {
        const list = [...state.primitives, normalizePrimitive(primitive)]
        const normalized = ensurePrimitiveNames(list)
        return {
          primitives: normalized,
          boundingBox: calculateObjectBoundingBox({
            uuid: '',
            name: '',
            primitives: normalized
          })
        }
      }),
    // Обновляет примитив по индексу
    updatePrimitive: (index: number, updates: Partial<GfxPrimitive>) =>
      set(state => {
        const list = state.primitives.map((p, i) =>
          i === index ? { ...p, ...updates } : p
        )
        const normalized = ensurePrimitiveNames(list)
        return {
          primitives: normalized,
          boundingBox: calculateObjectBoundingBox({
            uuid: '',
            name: '',
            primitives: normalized
          })
        }
      }),
    // Заменяет настройки освещения
    setLighting: (lighting: LightingSettings) => set({ lighting }),
    // Меняет режим отображения
    setRenderMode: (mode: RenderMode) => set({ renderMode: mode }),
    // Устанавливает активный режим трансформации
    setTransformMode: (mode: TransformMode) => set({ transformMode: mode }),
    // Инвертирует состояние видимости сетки
    toggleGridVisibility: () => set(state => ({ gridVisible: !state.gridVisible })),
    // Выбирает примитив по индексу
    selectPrimitive: (index: number) => set({ selectedPrimitiveIds: [index] }),
    togglePrimitiveSelection: (index: number) =>
      set(state => {
        const ids = state.selectedPrimitiveIds.includes(index)
          ? state.selectedPrimitiveIds.filter(id => id !== index)
          : [...state.selectedPrimitiveIds, index]
        return { selectedPrimitiveIds: ids }
      }),
    setSelectedPrimitives: (indices: number[]) => set({ selectedPrimitiveIds: indices }),
    // Записывает ID наведённого примитива
    setHoveredPrimitive: (index: number | null) => set({ hoveredPrimitiveId: index }),
    // Снимает выделение
    clearSelection: () => set({ selectedPrimitiveIds: [] }),
    // Очищает сцену и сбрасывает освещение
    clearScene: () =>
      set({
        primitives: [],
        lighting: initialLighting,
        selectedPrimitiveIds: [],
        hoveredPrimitiveId: null,
        boundingBox: undefined
      })
  }))
)

// Селекторы состояния стора объекта
export const useObjectPrimitives = () => useObjectStore(s => s.primitives)
export const useObjectLighting = () => useObjectStore(s => s.lighting)
export const useObjectSelectedPrimitiveIds = () => useObjectStore(s => s.selectedPrimitiveIds)
export const useObjectHoveredPrimitiveId = () => useObjectStore(s => s.hoveredPrimitiveId)
export const useObjectRenderMode = () => useObjectStore(s => s.renderMode)
export const useObjectTransformMode = () => useObjectStore(s => s.transformMode)
export const useObjectViewMode = () => useObjectStore(s => s.viewMode)
/** Селектор состояния видимости сетки */
export const useObjectGridVisible = () => useObjectStore(s => s.gridVisible)
/** Селектор BoundingBox текущего объекта */
export const useObjectBoundingBox = () => useObjectStore(s => s.boundingBox)
