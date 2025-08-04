/**
 * Публичное API фичи редактирования объекта
 */

export * from './model'
export * from './ui'

// AI интеграция
export { registerObjectEditorTools, unregisterObjectEditorTools, useObjectEditorToolRegistration } from './lib/ai'
// Хуки
export { useOEKeyboardShortcuts } from './lib/hooks/useOEKeyboardShortcuts'
export { useGlobalPanelState } from './lib/hooks/useGlobalPanelState'
