/**
 * Временные алиасы для миграции типов
 * 
 * ⚠️ ВРЕМЕННЫЙ ФАЙЛ ДЛЯ МИГРАЦИИ
 * 
 * Этот файл содержит алиасы типов из нового расположения
 * для обеспечения обратной совместимости во время миграции.
 * 
 * После завершения миграции всех импортов этот файл будет удален.
 */

// UI types - новое расположение: shared/types/ui
export type {
  ViewMode,
  RenderMode,
  TransformMode,
  SelectedObject,
  HoveredObject,
  SceneClickEvent,
  SceneHoverEvent,
  ObjectTransformEvent,
  PrimitiveTransformEvent
} from '@/shared/types/ui'

// Store types - новое расположение: features/scene/model
export type {
  SceneStore,
  SceneStoreState,
  SceneStoreActions,
  SceneStatus,
  SceneMetaData
} from '@/features/scene/model/store-types'

// Hook return types - новое расположение: features/scene/model
export type {
  UseSceneEventsReturn,
  UseObjectSelectionReturn,
  UsePrimitiveSelectionReturn,
  UseSceneHistoryReturn
} from '@/features/scene/model/view-types'