/**
 * LangChain инструменты для работы с примитивами в ObjectEditor
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { ObjectEditorAPI } from '../../objectEditorApi'

// Схемы для примитивов
const Vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number()
})

const PrimitiveSchema = z.object({
  primitiveType: z.enum(['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane']),
  position: Vector3Schema.optional().default({ x: 0, y: 0, z: 0 }),
  rotation: Vector3Schema.optional().default({ x: 0, y: 0, z: 0 }),
  scale: Vector3Schema.optional().default({ x: 1, y: 1, z: 1 }),
  materialUuid: z.string().optional(),
  name: z.string().optional()
})

/**
 * Инструмент для добавления новых примитивов в объект
 */
export const addPrimitivesTool = new DynamicStructuredTool({
  name: 'add_primitives',
  description: 'Добавить один или несколько примитивов в текущий объект.',
  schema: z.object({
    primitives: z.array(PrimitiveSchema).min(1).max(10)
  }),
  func: async ({ primitives }) => {
    try {
      const result = ObjectEditorAPI.addPrimitives(primitives)
      return JSON.stringify(result, null, 2)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      return JSON.stringify({ success: false, error: msg })
    }
  }
})

/**
 * Инструмент для изменения существующего примитива
 */
export const modifyPrimitiveTool = new DynamicStructuredTool({
  name: 'modify_primitive',
  description: 'Изменить примитив по индексу.',
  schema: z.object({
    index: z.number().int().min(0),
    updates: z.object({
      position: Vector3Schema.optional(),
      rotation: Vector3Schema.optional(),
      scale: Vector3Schema.optional(),
      materialUuid: z.string().optional(),
      name: z.string().optional(),
      visible: z.boolean().optional()
    })
  }),
  func: async ({ index, updates }) => {
    try {
      const result = ObjectEditorAPI.modifyPrimitive(index, updates)
      return JSON.stringify(result, null, 2)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      return JSON.stringify({ success: false, error: msg, index })
    }
  }
})

/**
 * Инструмент для удаления примитива
 */
export const removePrimitiveTool = new DynamicStructuredTool({
  name: 'remove_primitive',
  description: 'Удалить примитив по индексу.',
  schema: z.object({
    index: z.number().int().min(0)
  }),
  func: async ({ index }) => {
    try {
      const result = ObjectEditorAPI.removePrimitive(index)
      return JSON.stringify(result, null, 2)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      return JSON.stringify({ success: false, error: msg, index })
    }
  }
})

/**
 * Инструмент для дублирования примитива
 */
export const duplicatePrimitiveTool = new DynamicStructuredTool({
  name: 'duplicate_primitive',
  description: 'Дублировать примитив с указанным смещением и количеством.',
  schema: z.object({
    index: z.number().int().min(0),
    offset: Vector3Schema.optional().default({ x: 1, y: 0, z: 0 }),
    count: z.number().int().min(1).max(10).optional().default(1)
  }),
  func: async ({ index, offset, count }) => {
    try {
      const result = ObjectEditorAPI.duplicatePrimitive(index, offset, count)
      return JSON.stringify(result, null, 2)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      return JSON.stringify({ success: false, error: msg })
    }
  }
})

