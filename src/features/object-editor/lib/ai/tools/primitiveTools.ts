/**
 * LangChain инструменты для работы с примитивами в ObjectEditor
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

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
 * Создаёт инструмент для добавления новых примитивов в объект.
 * Используй его, когда требуется создать один или несколько примитивов.
 */
export const createAddPrimitivesTool = () => {
  return new DynamicStructuredTool({
    name: 'addPrimitives',
    description: 'Добавить один или несколько примитивов к объекту (массовая операция). Используй этот инструмент когда пользователь просит создать примитивы.',
    schema: z.object({
      primitives: z.array(PrimitiveSchema).min(1).max(10)
    }),
    func: async (input) => {
      // Обработка будет происходить через tool callback
      return `Добавлено ${input.primitives.length} примитив(ов)`
    }
  })
}

/**
 * Создаёт инструмент для изменения существующего примитива по индексу.
 * Полезно при изменении позиции, поворота, масштаба или материала примитива.
 */
export const createModifyPrimitiveTool = () => {
  return new DynamicStructuredTool({
    name: 'modifyPrimitive',
    description: 'Изменить существующий примитив по индексу. Используй когда нужно изменить позицию, поворот, масштаб или материал примитива.',
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
    func: async (input) => {
      return `Примитив ${input.index} обновлен`
    }
  })
}

/**
 * Создаёт инструмент для удаления примитива по индексу.
 * Используй при необходимости удалить конкретный примитив.
 */
export const createRemovePrimitiveTool = () => {
  return new DynamicStructuredTool({
    name: 'removePrimitive',
    description: 'Удалить примитив по индексу. Используй когда пользователь просит удалить конкретный примитив.',
    schema: z.object({
      index: z.number().int().min(0)
    }),
    func: async (input) => {
      return `Примитив ${input.index} удален`
    }
  })
}

/**
 * Создаёт инструмент для дублирования примитива с опциональным смещением.
 * Применяй для быстрого создания копий существующих примитивов.
 */
export const createDuplicatePrimitiveTool = () => {
  return new DynamicStructuredTool({
    name: 'duplicatePrimitive',
    description: 'Дублировать примитив с возможностью смещения. Используй для создания копий существующих примитивов.',
    schema: z.object({
      index: z.number().int().min(0),
      offset: Vector3Schema.optional().default({ x: 1, y: 0, z: 0 }),
      count: z.number().int().min(1).max(10).optional().default(1)
    }),
    func: async (input) => {
      return `Создано ${input.count} копий примитива`
    }
  })
}
