/**
 * LangChain инструменты для работы с материалами в ObjectEditor
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

/**
 * Создаёт инструмент для создания нового материала.
 * Применяй его, когда нужно добавить материал или изменить внешний вид объекта.
 */
export const createCreateMaterialTool = () => {
  return new DynamicStructuredTool({
    name: 'createMaterial',
    description: 'Создать новый материал для объекта. Используй когда пользователь просит создать материал или изменить внешний вид объекта.',
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
      return `Материал "${input.name}" создан`
    }
  })
}

/**
 * Создаёт инструмент для обновления существующего материала.
 * Используй для изменения свойств уже созданного материала.
 */
export const createUpdateMaterialTool = () => {
  return new DynamicStructuredTool({
    name: 'updateMaterial',
    description: 'Обновить существующий материал. Используй для изменения свойств материала.',
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
    func: async () => {
      return `Материал обновлен`
    }
  })
}

/**
 * Создаёт инструмент для назначения материала выбранным примитивам.
 * Помогает применять материал сразу к группе примитивов.
 */
export const createAssignMaterialTool = () => {
  return new DynamicStructuredTool({
    name: 'assignMaterial',
    description: 'Назначить материал примитиву или группе примитивов. Используй для применения материала к объектам.',
    schema: z.object({
      materialUuid: z.string(),
      primitiveIndices: z.array(z.number().int().min(0)).min(1)
    }),
    func: async (input) => {
      return `Материал назначен ${input.primitiveIndices.length} примитив(ам)`
    }
  })
}

/**
 * Создаёт инструмент для удаления материала из объекта.
 * Используй, когда материал больше не нужен или его нужно заменить.
 */
export const createRemoveMaterialTool = () => {
  return new DynamicStructuredTool({
    name: 'removeMaterial',
    description: 'Удалить материал из объекта. Используй когда материал больше не нужен.',
    schema: z.object({
      materialUuid: z.string(),
      replacementMaterialUuid: z.string().optional()
    }),
    func: async () => {
      return 'Материал удален'
    }
  })
}

/**
 * Создаёт инструмент для дублирования материала с возможными изменениями.
 * Полезно для создания вариаций существующего материала.
 */
export const createDuplicateMaterialTool = () => {
  return new DynamicStructuredTool({
    name: 'duplicateMaterial',
    description: 'Дублировать существующий материал с изменениями. Используй для создания вариаций материала.',
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
    func: async (input) => {
      return `Материал "${input.newName}" создан на основе исходного`
    }
  })
}
