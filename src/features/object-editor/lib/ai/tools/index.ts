/**
 * LangChain инструменты для ObjectEditor
 */

export { createAddPrimitivesTool } from './primitiveTools'
export { createGetObjectDataTool } from './objectTools'

/**
 * Возвращает массив всех инструментов ObjectEditor.
 * Вызывай эту функцию для регистрации инструментов в чат-сервисе.
 */
export const createObjectEditorTools = () => [
  createGetObjectDataTool(),
  createAddPrimitivesTool()
]

export const objectEditorTools = createObjectEditorTools()

