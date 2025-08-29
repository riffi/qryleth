/**
 * UI типы общего назначения
 *
 * Типы и перечисления для UI состояний, используемые в разных features.
 * В новых API рекомендуется использовать enum-перечисления ниже, а
 * строковые тип-алиасы оставлены для обратной совместимости на период миграции.
 */

// View modes for camera controls
// Новые enum-перечисления (рекомендуемые для использования)
export enum ViewModeEnum {
  Orbit = 'orbit',
  Walk = 'walk',
  Fly = 'fly',
  /** Автоматический облёт пиков ландшафта */
  Flyover = 'flyover',
}

export enum RenderModeEnum {
  Solid = 'solid',
  Wireframe = 'wireframe',
}

export enum TransformModeEnum {
  Translate = 'translate',
  Rotate = 'rotate',
  Scale = 'scale',
}

export enum UiMode {
  Edit = 'edit',
  Play = 'play',
}

export enum RenderProfile {
  Edit = 'edit',
  View = 'view',
}

// Тип-алиасы для совместимости (будут заменены enum'ами в последующих фазах)
export type ViewMode = 'orbit' | 'walk' | 'fly' | 'flyover'
export type RenderMode = 'solid' | 'wireframe'
export type TransformMode = 'translate' | 'rotate' | 'scale'

/**
 * Поза камеры для сохранения/восстановления между режимами и переключениями камер.
 * position — абсолютное положение камеры.
 * target — цель (для Orbit) в мировых координатах.
 * rotation — эйлерова ориентация камеры (используется для Walk/Fly).
 */
export interface CameraPose {
  position: [number, number, number]
  target?: [number, number, number]
  rotation?: [number, number, number]
}

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
