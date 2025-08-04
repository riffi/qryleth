/**
 * Модуль интеграции AI для редактора объектов
 */

import React from 'react'
import type { ToolProvider } from '@/shared/lib/langchain/types'
import { toolRegistry } from '@/shared/lib/langchain/toolRegistry'
import {
  addPrimitivesTool,
  modifyPrimitiveTool,
  removePrimitiveTool,
  duplicatePrimitiveTool,
  createMaterialTool,
  updateMaterialTool,
  assignMaterialTool,
  removeMaterialTool,
  duplicateMaterialTool,
  analyzeObjectTool,
  optimizeObjectTool,
  validateObjectTool,
  suggestImprovementsTool,
  calculateStatsTool,
  generateVariationsTool
} from './tools'

/**
 * Провайдер инструментов object-editor для LangChain
 */
export const objectEditorToolProvider: ToolProvider = {
  featureName: 'object-editor',
  getTools: () => [
    addPrimitivesTool,
    modifyPrimitiveTool,
    removePrimitiveTool,
    duplicatePrimitiveTool,
    createMaterialTool,
    updateMaterialTool,
    assignMaterialTool,
    removeMaterialTool,
    duplicateMaterialTool,
    analyzeObjectTool,
    optimizeObjectTool,
    validateObjectTool,
    suggestImprovementsTool,
    calculateStatsTool,
    generateVariationsTool
  ]
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

/**
 * React-хук автоматической регистрации инструментов object-editor
 * Регистрирует инструменты при монтировании компонента и убирает их при размонтировании
 */
export function useObjectEditorToolRegistration(): void {
  React.useEffect(() => {
    registerObjectEditorTools()
    return () => unregisterObjectEditorTools()
  }, [])
}

