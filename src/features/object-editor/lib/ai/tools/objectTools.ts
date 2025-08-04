/**
 * LangChain инструменты для работы с объектом в ObjectEditor
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { ObjectEditorApi } from '../../objectEditorApi'

/**
 * Создаёт инструмент для получения полных данных объекта.
 * Используй его, когда требуется получить структуру объекта целиком (GfxObject).
 */
export const createGetObjectDataTool = () => {
  return new DynamicStructuredTool({
    name: 'getObjectData',
    description: 'Получить полные данные текущего объекта (GfxObject).',
    schema: z.object({}),
    func: async () => {
      const object = ObjectEditorApi.getObjectData()
      return JSON.stringify(object)
    }
  })
}

