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

// Selection state interfaces
export interface SelectedObject {
  objectUuid: string
  instanceUuid?: string
  /** Index of the object instance within scene */
  objectInstanceIndex?: number
}

export interface HoveredObject {
  objectUuid: string
  instanceId?: string
  /** Index of the hovered instance */
  objectInstanceIndex?: number
}

// Re-export events from events module
export * from './events'
