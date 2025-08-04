/**
 * AI инструменты для ObjectEditor
 */

export * from './primitiveTools'
export * from './materialTools'
export * from './objectStructureTools'

import { 
  addPrimitivesTool,
  modifyPrimitiveTool,
  removePrimitiveTool,
  duplicatePrimitiveTool
} from './primitiveTools'

import {
  createMaterialTool,
  updateMaterialTool,
  assignMaterialTool,
  removeMaterialTool,
  duplicateMaterialTool
} from './materialTools'

import {
  analyzeObjectTool,
  optimizeObjectTool,
  validateObjectTool,
  suggestImprovementsTool,
  calculateStatsTool,
  generateVariationsTool
} from './objectStructureTools'

import type { ToolDefinition } from '@/shared/entities/chat'

/**
 * Все доступные AI инструменты для ObjectEditor
 */
export const objectEditorAITools: ToolDefinition[] = [
  // Инструменты для работы с примитивами
  addPrimitivesTool,
  modifyPrimitiveTool,
  removePrimitiveTool,
  duplicatePrimitiveTool,
  
  // Инструменты для работы с материалами
  createMaterialTool,
  updateMaterialTool,
  assignMaterialTool,
  removeMaterialTool,
  duplicateMaterialTool,
  
  // Инструменты для анализа и оптимизации
  analyzeObjectTool,
  optimizeObjectTool,
  validateObjectTool,
  suggestImprovementsTool,
  calculateStatsTool,
  generateVariationsTool
]

/**
 * Группировка инструментов по категориям
 */
export const toolCategories = {
  primitives: [addPrimitivesTool, modifyPrimitiveTool, removePrimitiveTool, duplicatePrimitiveTool],
  materials: [createMaterialTool, updateMaterialTool, assignMaterialTool, removeMaterialTool, duplicateMaterialTool],
  analysis: [analyzeObjectTool, optimizeObjectTool, validateObjectTool, suggestImprovementsTool, calculateStatsTool, generateVariationsTool]
} as const

// Обратная совместимость
export const objectEditorTools = objectEditorAITools
