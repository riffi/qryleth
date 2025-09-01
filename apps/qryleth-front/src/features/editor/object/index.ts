/**
 * Пакет features/editor/object — новый неймспейс для редактора объекта.
 *
 * На фазе 3 выполняется только перенос API через реэкспорт существующих модулей
 * из features/object-editor. Фактический перенос файлов запланирован на следующую фазу.
 */

export * from './ui'
export * from './model'
export * from './renderer'
export * from './properties'
export * from './chat'
export * from './hooks'
export * from './lib'

// Временный реэкспорт AI‑регистрации инструментов, чтобы сохранить совместимость API
export {
  registerObjectEditorTools,
  unregisterObjectEditorTools,
  useObjectEditorToolRegistration,
} from '@/features/editor/object/lib/ai'
