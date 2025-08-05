/**
 * LangChain инструменты для работы с примитивами в ObjectEditor
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { ObjectEditorApi } from '../../objectEditorApi'

// Схемы валидации геометрии примитивов
const BoxGeometrySchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  depth: z.number().positive()
})

const SphereGeometrySchema = z.object({
  radius: z.number().positive()
})

const CylinderGeometrySchema = z.object({
  radiusTop: z.number().positive(),
  radiusBottom: z.number().positive(),
  height: z.number().positive(),
  radialSegments: z.number().int().positive().optional()
})

const ConeGeometrySchema = z.object({
  radius: z.number().positive(),
  height: z.number().positive(),
  radialSegments: z.number().int().positive().optional()
})

const PyramidGeometrySchema = z.object({
  baseSize: z.number().positive(),
  height: z.number().positive()
})

const PlaneGeometrySchema = z.object({
  width: z.number().positive(),
  height: z.number().positive()
})

const TorusGeometrySchema = z.object({
  majorRadius: z.number().positive(),
  minorRadius: z.number().positive(),
  radialSegments: z.number().int().positive().optional(),
  tubularSegments: z.number().int().positive().optional()
})

// Схема общих свойств примитива
const PrimitiveCommonSchema = z.object({
  name: z.string().min(1).optional(),
  objectMaterialUuid: z.string().optional(),
  globalMaterialUuid: z.string().optional(),
  transform: z
    .object({
      position: z.array(z.number()).length(3).optional(),
      rotation: z.array(z.number()).length(3).optional(),
      scale: z.array(z.number()).length(3).optional()
    })
    .optional()
})

// Дискриминированная схема примитива
const PrimitiveSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('box'), geometry: BoxGeometrySchema }).merge(PrimitiveCommonSchema),
  z.object({ type: z.literal('sphere'), geometry: SphereGeometrySchema }).merge(PrimitiveCommonSchema),
  z.object({ type: z.literal('cylinder'), geometry: CylinderGeometrySchema }).merge(PrimitiveCommonSchema),
  z.object({ type: z.literal('cone'), geometry: ConeGeometrySchema }).merge(PrimitiveCommonSchema),
  z.object({ type: z.literal('pyramid'), geometry: PyramidGeometrySchema }).merge(PrimitiveCommonSchema),
  z.object({ type: z.literal('plane'), geometry: PlaneGeometrySchema }).merge(PrimitiveCommonSchema),
  z.object({ type: z.literal('torus'), geometry: TorusGeometrySchema }).merge(PrimitiveCommonSchema)
])

/**
 * Инструмент для добавления новых примитивов в объект.
 * Используется, когда необходимо создать один или несколько примитивов.
 * Поддерживает создание групп для организации примитивов.
 */
export const addPrimitivesTool = new DynamicStructuredTool({
  name: 'addPrimitives',
  description: 'Добавить один или несколько примитивов к объекту. Опционально можно создать группу для примитивов. Используй когда пользователь просит создать примитивы.',
  schema: z.object({
    primitives: z.array(PrimitiveSchema).min(1).max(10),
    groupName: z.string().min(1).optional().describe('Имя группы для создания и привязки добавляемых примитивов'),
    parentGroupUuid: z.string().optional().describe('UUID родительской группы для создания подгруппы')
  }),
  func: async (input) => {
    const result = ObjectEditorApi.addPrimitives(
      input.primitives, 
      input.groupName, 
      input.parentGroupUuid
    )
    return JSON.stringify({ 
      success: true, 
      addedCount: result.addedCount,
      groupUuid: result.groupUuid,
      groupCreated: !!result.groupUuid
    })
  }
})

