/**
 * Scene View типы
 *
 * UI типы, специфичные для scene feature:
 * - Hook return types
 * - Component props types
 * - Scene-specific UI state
 */


import type { SelectedSceneObject, HoveredSceneObject, SceneClickEvent, SceneHoverEvent, ObjectTransformEvent, PrimitiveTransformEvent } from '@/shared/types/ui'

// Hook return types
export interface UseSceneEventsReturn {
  handleClick: (event: any) => void
  handlePointerOver: (event: any) => void
  handlePointerOut: (event: any) => void
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
