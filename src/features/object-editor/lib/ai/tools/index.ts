/**
 * LangChain инструменты для ObjectEditor
 */

export {
  createAddPrimitivesTool,
  createModifyPrimitiveTool,
  createRemovePrimitiveTool,
  createDuplicatePrimitiveTool
} from './primitiveTools'

export {
  createCreateMaterialTool,
  createUpdateMaterialTool,
  createAssignMaterialTool,
  createRemoveMaterialTool,
  createDuplicateMaterialTool
} from './materialTools'

export {
  createAnalyzeObjectTool,
  createOptimizeObjectTool,
  createValidateObjectTool,
  createSuggestImprovementsTool,
  createCalculateStatsTool,
  createGenerateVariationsTool
} from './analysisTools'

/**
 * Возвращает массив всех инструментов ObjectEditor.
 * Вызывай эту функцию для регистрации инструментов в чат-сервисе.
 */
export const createObjectEditorTools = () => [
  // Инструменты для работы с примитивами
  createAddPrimitivesTool(),
  createModifyPrimitiveTool(),
  createRemovePrimitiveTool(),
  createDuplicatePrimitiveTool(),

  // Инструменты для работы с материалами
  createCreateMaterialTool(),
  createUpdateMaterialTool(),
  createAssignMaterialTool(),
  createRemoveMaterialTool(),
  createDuplicateMaterialTool(),

  // Инструменты для анализа и оптимизации
  createAnalyzeObjectTool(),
  createOptimizeObjectTool(),
  createValidateObjectTool(),
  createSuggestImprovementsTool(),
  createCalculateStatsTool(),
  createGenerateVariationsTool()
]

