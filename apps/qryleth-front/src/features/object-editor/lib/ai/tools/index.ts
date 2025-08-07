/**
 * LangChain инструменты для ObjectEditor
 */

import { addPrimitivesTool, getGlobalMaterialsTool, getObjectMaterialsTool } from './primitiveTools'
import { getObjectDataTool } from './objectTools'

/**
 * Возвращает массив всех инструментов ObjectEditor.
 * Вызывай эту функцию для регистрации инструментов в чат-сервисе.
 */
export const createObjectEditorTools = () => [
  getObjectDataTool,
  addPrimitivesTool,
  getGlobalMaterialsTool,
  getObjectMaterialsTool
]


