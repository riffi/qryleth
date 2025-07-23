/**
 * Scene View типы
 *
 * UI типы, специфичные для scene feature:
 * - Hook return types
 * - Component props types
 * - Scene-specific UI state
 */


import type { SelectedObject, HoveredObject, SceneClickEvent, SceneHoverEvent, ObjectTransformEvent, PrimitiveTransformEvent } from '@/shared/types/ui'

// Hook return types
export interface UseSceneEventsReturn {
  onSceneClick: (event: SceneClickEvent) => void
  onSceneHover: (event: SceneHoverEvent | null) => void
  onObjectTransform: (event: ObjectTransformEvent) => void
  onPrimitiveTransform: (event: PrimitiveTransformEvent) => void
}



export interface UsePrimitiveSelectionReturn {
  selectedPrimitive: {
    objectUuid: string
    primitiveIndex: number
    instanceId?: string
  } | null
  selectPrimitive: (objectUuid: string, primitiveIndex: number, instanceId?: string) => void
  clearPrimitiveSelection: () => void
}

export interface UseSceneHistoryReturn {
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  saveToHistory: () => void
  historyLength: number
  historyIndex: number
}
