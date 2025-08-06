/**
 * LangChain инструменты для работы с примитивами в ObjectEditor
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { ObjectEditorApi } from '../../objectEditorApi'
import { materialRegistry } from '@/shared/lib/materials'

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

// Схема для создания нового материала объекта
const CreateObjectMaterialSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['metal', 'dielectric', 'glass', 'emissive', 'custom']),
  properties: z.object({
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    opacity: z.number().min(0).max(1).optional(),
    transparent: z.boolean().optional(),
    metalness: z.number().min(0).max(1).optional(),
    roughness: z.number().min(0).max(1).optional(),
    emissive: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    emissiveIntensity: z.number().min(0).optional(),
    ior: z.number().positive().optional(),
    envMapIntensity: z.number().min(0).optional(),
    side: z.enum(['front', 'back', 'double']).optional(),
    alphaTest: z.number().min(0).max(1).optional(),
    castShadow: z.boolean().optional(),
    receiveShadow: z.boolean().optional()
  }),
  description: z.string().optional()
})

// Схема общих свойств примитива с обязательным назначением материала
const PrimitiveCommonSchema = z.object({
  name: z.string().min(1).optional(),
  material: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('global'),
      globalMaterialUuid: z.string().describe('UUID глобального материала')
    }),
    z.object({
      type: z.literal('object'),
      objectMaterialUuid: z.string().describe('UUID существующего материала объекта')
    }),
    z.object({
      type: z.literal('createNew'),
      createMaterial: CreateObjectMaterialSchema
    })
  ]).describe('Обязательное назначение материала: либо глобальный, либо существующий материал объекта, либо создание нового'),
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
 * ВАЖНО: При добавлении примитивов материалы назначать ОБЯЗАТЕЛЬНО!
 */
export const addPrimitivesTool = new DynamicStructuredTool({
  name: 'addPrimitives',
  description: 'Добавить один или несколько примитивов к объекту с ОБЯЗАТЕЛЬНЫМ назначением материалов. Материалы можно: 1) выбрать из глобальных (используй getGlobalMaterials), 2) выбрать из материалов объекта, 3) создать новый материал объекта и сразу назначить его. Опционально можно создать группу для примитивов.',
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

/**
 * Инструмент для получения списка материалов текущего объекта.
 * Возвращает только uuid и name для упрощенного выбора.
 */
export const getObjectMaterialsTool = new DynamicStructuredTool({
  name: 'getObjectMaterials',
  description: 'Получить список всех материалов текущего объекта (только uuid и name). Используй этот инструмент, чтобы узнать какие материалы объекта можно применять к примитивам.',
  schema: z.object({}),
  func: async () => {
    try {
      const objectData = ObjectEditorApi.getObjectData()

      const materialsInfo = objectData.materials.map(material => ({
        uuid: material.uuid,
        name: material.name,
      }))

      return JSON.stringify({
        success: true,
        materials: materialsInfo,
        count: materialsInfo.length
      })

    } catch (error) {
      console.error('Ошибка при получении материалов объекта:', error)

      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      })
    }
  }
})

/**
 * Инструмент для получения списка доступных глобальных материалов.
 * Возвращает только uuid и name для упрощенного выбора.
 */
export const getGlobalMaterialsTool = new DynamicStructuredTool({
  name: 'getGlobalMaterials',
  description: 'Получить список всех доступных глобальных материалов (только uuid и name). Используй этот инструмент, чтобы узнать какие материалы можно применять к примитивам.',
  schema: z.object({}),
  func: async () => {
    try {
      const materials = materialRegistry.getAllMaterials()

      const materialsInfo = Object.entries(materials).map(([uuid, material]) => ({
        uuid,
        name: material.name,
      }))

      return JSON.stringify({
        success: true,
        materials: materialsInfo,
        count: materialsInfo.length
      })

    } catch (error) {
      console.error('Ошибка при получении глобальных материалов:', error)

      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      })
    }
  }
})

