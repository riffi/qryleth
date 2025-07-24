/**
 * Публичное API фичи редактирования объекта
 */

export * from './model'
export * from './ui'

// AI интеграция
export { registerObjectEditorTools, unregisterObjectEditorTools } from './lib/ai'
