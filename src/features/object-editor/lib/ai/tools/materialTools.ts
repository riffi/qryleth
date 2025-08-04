/**
 * LangChain инструменты для работы с материалами в ObjectEditor
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { ObjectEditorAPI } from '../../objectEditorApi'

/**
 * Инструмент создания нового материала
 */
export const createMaterialTool = new DynamicStructuredTool({
  name: 'create_material',
  description: 'Создать новый материал и добавить его в объект.',
  schema: z.object({
    name: z.string(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Цвет должен быть в формате HEX (#RRGGBB)'),
    metalness: z.number().min(0).max(1).optional().default(0),
    roughness: z.number().min(0).max(1).optional().default(0.5),
    opacity: z.number().min(0).max(1).optional().default(1),
    emissive: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    emissiveIntensity: z.number().min(0).max(10).optional().default(0)
  }),
  func: async (input) => {
    try {
      const result = ObjectEditorAPI.createMaterial(input)
      return JSON.stringify(result, null, 2)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      return JSON.stringify({ success: false, error: msg })
    }
  }
})

/**
 * Инструмент обновления существующего материала
 */
export const updateMaterialTool = new DynamicStructuredTool({
  name: 'update_material',
  description: 'Обновить свойства существующего материала.',
  schema: z.object({
    materialUuid: z.string(),
    updates: z.object({
      name: z.string().optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      metalness: z.number().min(0).max(1).optional(),
      roughness: z.number().min(0).max(1).optional(),
      opacity: z.number().min(0).max(1).optional(),
      emissive: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      emissiveIntensity: z.number().min(0).max(10).optional()
    })
  }),
  func: async ({ materialUuid, updates }) => {
    try {
      const result = ObjectEditorAPI.updateMaterial(materialUuid, updates)
      return JSON.stringify(result, null, 2)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      return JSON.stringify({ success: false, error: msg })
    }
  }
})

/**
 * Инструмент назначения материала примитивам
 */
export const assignMaterialTool = new DynamicStructuredTool({
  name: 'assign_material',
  description: 'Назначить материал указанным примитивам.',
  schema: z.object({
    materialUuid: z.string(),
    primitiveIndices: z.array(z.number().int().min(0)).min(1)
  }),
  func: async ({ materialUuid, primitiveIndices }) => {
    try {
      const result = ObjectEditorAPI.assignMaterial(materialUuid, primitiveIndices)
      return JSON.stringify(result, null, 2)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      return JSON.stringify({ success: false, error: msg })
    }
  }
})

/**
 * Инструмент удаления материала
 */
export const removeMaterialTool = new DynamicStructuredTool({
  name: 'remove_material',
  description: 'Удалить материал из объекта.',
  schema: z.object({
    materialUuid: z.string(),
    replacementMaterialUuid: z.string().optional()
  }),
  func: async ({ materialUuid, replacementMaterialUuid }) => {
    try {
      const result = ObjectEditorAPI.removeMaterial(materialUuid, replacementMaterialUuid)
      return JSON.stringify(result, null, 2)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      return JSON.stringify({ success: false, error: msg })
    }
  }
})

/**
 * Инструмент дублирования материала
 */
export const duplicateMaterialTool = new DynamicStructuredTool({
  name: 'duplicate_material',
  description: 'Создать копию материала с возможными изменениями.',
  schema: z.object({
    sourceMaterialUuid: z.string(),
    newName: z.string(),
    modifications: z.object({
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      metalness: z.number().min(0).max(1).optional(),
      roughness: z.number().min(0).max(1).optional(),
      opacity: z.number().min(0).max(1).optional(),
      emissive: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      emissiveIntensity: z.number().min(0).max(10).optional()
    }).optional()
  }),
  func: async ({ sourceMaterialUuid, newName, modifications }) => {
    try {
      const result = ObjectEditorAPI.duplicateMaterial(sourceMaterialUuid, newName, modifications)
      return JSON.stringify(result, null, 2)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      return JSON.stringify({ success: false, error: msg })
    }
  }
})

