/**
 * Модуль интеграции AI для редактора объектов
 */

import type { ToolProvider } from '@/shared/lib/langchain/types'
import { toolRegistry } from '@/shared/lib/langchain/toolRegistry'
import { objectEditorTools } from './tools'

/**
 * Провайдер инструментов object-editor для LangChain
 */
export const objectEditorToolProvider: ToolProvider = {
  featureName: 'object-editor',
  getTools: () => [...objectEditorTools]
}

/**
 * Регистрация инструментов object-editor в глобальном реестре
 */
export function registerObjectEditorTools(): void {
  toolRegistry.registerProvider(objectEditorToolProvider)
}

/**
 * Отмена регистрации инструментов object-editor
 */
export function unregisterObjectEditorTools(): void {
  toolRegistry.unregisterProvider('object-editor')
}
