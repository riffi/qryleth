/**
 * Пакет `features/editor/object` — актуальный неймспейс редактора объекта.
 *
 * Миграция завершена (027): исходники перенесены в данный неймспейс,
 * старый `features/object-editor` удалён. Публичный API сфокусирован и
 * не содержит избыточных реэкспортов. Рекомендуемые точки входа:
 * - `@/features/editor/object` — основные UI-компоненты редактора объекта
 * - `@/features/editor/object/hooks` — публичные React-хуки фичи
 * - `@/features/editor/object/lib` — прикладные утилиты и интеграции (в т.ч. AI)
 * - `@/features/editor/object/model` — сторы и типы модели объекта
 */

export * from './ui'
export * from './model'
export * from './hooks'
export * from './lib'

// Временный реэкспорт AI‑регистрации инструментов, чтобы сохранить совместимость API
export {
  registerObjectEditorTools,
  unregisterObjectEditorTools,
  useObjectEditorToolRegistration,
} from '@/features/editor/object/lib/ai'
