import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import type { GFXObjectWithTransform } from '@/entities/object/model/types'
import type { GfxPrimitive } from '@/entities'

// Схема валидации для примитива
const PrimitiveSchema = z.object({
  type: z.enum(['box', 'sphere', 'cylinder', 'cone', 'pyramid', 'plane']),
  // Box parameters
  width: z.number().optional(),
  height: z.number().optional(),
  depth: z.number().optional(),
  // Sphere parameters
  radius: z.number().optional(),
  // Cylinder parameters
  radiusTop: z.number().optional(),
  radiusBottom: z.number().optional(),
  radialSegments: z.number().optional(),
  // Pyramid parameters
  baseSize: z.number().optional(),
  // Material properties
  color: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
  emissive: z.string().optional(),
  emissiveIntensity: z.number().min(0).optional(),
  // Transform properties
  position: z.array(z.number()).length(3).optional(),
  rotation: z.array(z.number()).length(3).optional()
})

// Схема валидации для объекта
const ObjectSchema = z.object({
  name: z.string(),
  primitives: z.array(PrimitiveSchema),
  position: z.array(z.number()).length(3).optional(),
  rotation: z.array(z.number()).length(3).optional(),
  scale: z.array(z.number()).length(3).optional()
})

/**
 * LangChain инструмент для добавления нового объекта в сцену
 * Адаптированный из существующего add_new_object инструмента
 */
export const createAddNewObjectTool = () => {
  return new DynamicStructuredTool({
    name: 'add_new_object',
    description: 'Добавляет новый объект в текущую сцену. Создает новый объект из примитивов и размещает его в указанной позиции.',
    schema: ObjectSchema,
    func: async (input): Promise<string> => {
      try {
        // Валидация входных данных уже выполнена схемой
        const validatedInput = input

        // Преобразование примитивов в GfxPrimitive формат
        const primitives: GfxPrimitive[] = validatedInput.primitives.map(primitive => {
          const gfxPrimitive: GfxPrimitive = {
            uuid: uuidv4(),
            type: primitive.type,
            // Геометрические параметры
            ...(primitive.width !== undefined && { width: primitive.width }),
            ...(primitive.height !== undefined && { height: primitive.height }),
            ...(primitive.depth !== undefined && { depth: primitive.depth }),
            ...(primitive.radius !== undefined && { radius: primitive.radius }),
            ...(primitive.radiusTop !== undefined && { radiusTop: primitive.radiusTop }),
            ...(primitive.radiusBottom !== undefined && { radiusBottom: primitive.radiusBottom }),
            ...(primitive.radialSegments !== undefined && { radialSegments: primitive.radialSegments }),
            ...(primitive.baseSize !== undefined && { baseSize: primitive.baseSize }),
            // Материал
            ...(primitive.color !== undefined && { color: primitive.color }),
            ...(primitive.opacity !== undefined && { opacity: primitive.opacity }),
            ...(primitive.emissive !== undefined && { emissive: primitive.emissive }),
            ...(primitive.emissiveIntensity !== undefined && { emissiveIntensity: primitive.emissiveIntensity }),
            // Трансформации
            ...(primitive.position !== undefined && {
              position: primitive.position as [number, number, number]
            }),
            ...(primitive.rotation !== undefined && {
              rotation: primitive.rotation as [number, number, number]
            })
          }
          return gfxPrimitive
        })

        // Создание объекта в формате GFXObjectWithTransform
        const newObject: GFXObjectWithTransform = {
          uuid: uuidv4(),
          name: validatedInput.name,
          primitives,
          ...(validatedInput.position && {
            position: validatedInput.position as [number, number, number]
          }),
          ...(validatedInput.rotation && {
            rotation: validatedInput.rotation as [number, number, number]
          }),
          ...(validatedInput.scale && {
            scale: validatedInput.scale as [number, number, number]
          })
        }

        // Возвращаем JSON строку с объектом для обработки в ChatInterface
        return JSON.stringify({
          success: true,
          object: newObject,
          message: `Объект "${validatedInput.name}" создан с ${primitives.length} примитивами`
        })

      } catch (error) {
        console.error('Ошибка при создании объекта:', error)

        const errorMessage = error instanceof z.ZodError
          ? `Ошибка валидации: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          : `Ошибка создания объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`

        return JSON.stringify({
          success: false,
          error: errorMessage,
          message: `Не удалось создать объект: ${errorMessage}`
        })
      }
    }
  })
}

/**
 * Создает инструмент add_new_object для регистрации в LangChain сервисе
 */
export const addNewObjectTool = createAddNewObjectTool()
