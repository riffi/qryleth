/**
 * LangChain инструменты для ObjectEditor
 */

export * from './langchainPrimitiveTools'
export * from './langchainMaterialTools'
export * from './langchainAnalysisTools'

import {
  createAddPrimitivesTool,
  createModifyPrimitiveTool,
  createRemovePrimitiveTool,
  createDuplicatePrimitiveTool
} from './langchainPrimitiveTools'

import {
  createCreateMaterialTool,
  createUpdateMaterialTool,
  createAssignMaterialTool,
  createRemoveMaterialTool,
  createDuplicateMaterialTool
} from './langchainMaterialTools'

import {
  createAnalyzeObjectTool,
  createOptimizeObjectTool,
  createValidateObjectTool,
  createSuggestImprovementsTool,
  createCalculateStatsTool,
  createGenerateVariationsTool
} from './langchainAnalysisTools'

/**
 * Создает все LangChain инструменты для ObjectEditor
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