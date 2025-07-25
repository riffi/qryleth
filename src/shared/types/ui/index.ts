/**
 * UI типы общего назначения
 *
 * Типы для UI состояний, которые используются в разных features:
 * - ViewMode, RenderMode - режимы отображения
 * - Selection типы - состояние выделения
 * - Transform типы - режимы трансформации
 */

// View modes for camera controls
export type ViewMode = 'orbit' | 'walk' | 'fly'
export type RenderMode = 'solid' | 'wireframe'
export type TransformMode = 'translate' | 'rotate' | 'scale'

// Selection state interfaces for Scene Editor
export interface SelectedSceneObject {
  objectUuid: string
  instanceUuid?: string
}

export interface HoveredSceneObject {
  objectUuid: string
  instanceId?: string
  /** Index of the hovered instance */
  objectInstanceIndex?: number
}

// Selection state interfaces for Object Editor
export interface SelectedObjectPrimitive {
  objectUuid: string
}

export interface HoveredObjectPrimitive {
  objectUuid: string
}

// Legacy types for backward compatibility
/** @deprecated Use SelectedSceneObject or SelectedObjectPrimitive instead */
export interface SelectedObject {
  objectUuid: string
  instanceUuid?: string
}

/** @deprecated Use HoveredSceneObject or HoveredObjectPrimitive instead */
export interface HoveredObject {
  objectUuid: string
  instanceId?: string
  /** Index of the hovered instance */
  objectInstanceIndex?: number
}

// Re-export events from events module
export * from './events'
