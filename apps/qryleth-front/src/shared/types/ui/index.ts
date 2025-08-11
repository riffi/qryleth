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
  isInstanced?: boolean
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


// Re-export events from events module
export * from './events'
