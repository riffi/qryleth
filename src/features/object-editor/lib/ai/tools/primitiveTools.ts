/**
 * LangChain инструменты для работы с примитивами в ObjectEditor
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { ObjectEditorApi } from '../../objectEditorApi'

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
 * Инструмент для добавления новых примитивов в объект.
 * Используется, когда необходимо создать один или несколько примитивов.
 */
export const addPrimitivesTool = new DynamicStructuredTool({
  name: 'addPrimitives',
  description: 'Добавить один или несколько примитивов к объекту. Используй когда пользователь просит создать примитивы.',
  schema: z.object({
    primitives: z.array(PrimitiveSchema).min(1).max(10)
  }),
  func: async (input) => {
    const added = ObjectEditorApi.addPrimitives(input.primitives)
    return JSON.stringify({ success: true, added })
  }
})

