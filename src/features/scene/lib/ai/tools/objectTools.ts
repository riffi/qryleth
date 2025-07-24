import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import type { GFXObjectWithTransform } from '@/entities/object/model/types'
import type { GfxPrimitive } from '@/entities'
import { generatePrimitiveName } from '@/entities/primitive'
import { db } from '@/shared/lib/database'
import {SceneAPI} from "@/features/scene/lib/sceneAPI.ts";

// Схема валидации для примитива
const PrimitiveSchema = z.object({
  type: z.enum(['box', 'sphere', 'cylinder', 'cone', 'pyramid', 'plane']),
  // Читаемое имя примитива. Может отсутствовать, тогда будет сгенерировано
  // автоматически
  name: z.string().min(1).optional(),
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
  color: z.string(),
  opacity: z.number().min(0).max(1).optional(),
  emissive: z.string().optional(),
  emissiveIntensity: z.number().min(0).optional(),
  // Transform properties
  position: z.array(z.number()).length(3).optional(),
  rotation: z.array(z.number()).length(3).optional()
})

// Схема валидации для объекта
const ObjectSchema = z.object({
  name: z.string().describe("Имя объекта на русском"),
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
    description: 'Добавляет новый объект в текущую сцену. Создает новый объект из примитивов и размещает его в указанной позиции. в position указываются центры примитивов',
    schema: ObjectSchema,
    func: async (input): Promise<string> => {
      try {
        // Валидация входных данных уже выполнена схемой
        const validatedInput = input

        // Преобразование примитивов в GfxPrimitive формат
        const primitives: GfxPrimitive[] = validatedInput.primitives.map((primitive, index) => {
          const gfxPrimitive: GfxPrimitive = {
            uuid: uuidv4(),
            type: primitive.type,
            name: primitive.name && primitive.name.trim() !== ''
              ? primitive.name
              : generatePrimitiveName(primitive.type, index + 1),
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

        // Использовать новый метод SceneAPI для добавления объекта
        const result = SceneAPI.addObjectWithTransform(newObject)

        if (!result.success) {
          return JSON.stringify({
            success: false,
            error: result.error,
            message: `Не удалось добавить объект "${validatedInput.name}" в сцену: ${result.error}`
          })
        }

        return JSON.stringify({
          success: true,
          object: newObject,
          objectUuid: result.objectUuid,
          instanceUuid: result.instanceUuid,
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

/**
 * LangChain инструмент для поиска объектов в библиотеке
 */
export const searchObjectsInLibraryTool = new DynamicStructuredTool({
  name: 'search_objects_in_library',
  description: 'Выполняет поиск объектов в библиотеке по названию или описанию. Возвращает список найденных объектов с их характеристиками.',
  schema: z.object({
    query: z.string().describe('Поисковый запрос (название или описание объекта)')
  }),
  func: async (input): Promise<string> => {
    try {
      const allObjects = await db.getAllObjects()

      const filteredObjects = allObjects.filter(object =>
        object.name.toLowerCase().includes(input.query.toLowerCase()) ||
        (object.description?.toLowerCase().includes(input.query.toLowerCase()) ?? false)
      )

      if (filteredObjects.length === 0) {
        return JSON.stringify({
          success: true,
          objects: [],
          message: `По запросу "${input.query}" объекты не найдены`
        })
      }

      const objectsInfo = filteredObjects.map(object => ({
        uuid: object.uuid,
        name: object.name,
        description: object.description,
        primitivesCount: object.objectData.primitives.length,
        updatedAt: object.updatedAt.toISOString()
      }))

      return JSON.stringify({
        success: true,
        objects: objectsInfo,
        message: `Найдено ${filteredObjects.length} объектов по запросу "${input.query}"`
      })

    } catch (error) {
      console.error('Ошибка при поиске объектов в библиотеке:', error)

      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        message: `Не удалось выполнить поиск объектов: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      })
    }
  }
})

/**
 * LangChain инструмент для добавления объекта из библиотеки в сцену
 */
export const addObjectFromLibraryTool = new DynamicStructuredTool({
  name: 'add_object_from_library',
  description: 'Добавляет существующий объект из библиотеки в текущую сцену. Использует UUID объекта для его загрузки и добавления.',
  schema: z.object({
    objectUuid: z.string().describe('UUID объекта из библиотеки'),
    position: z.array(z.number()).length(3).optional().describe('Позиция объекта в сцене [x, y, z]'),
    rotation: z.array(z.number()).length(3).optional().describe('Поворот объекта [rx, ry, rz] в радианах'),
    scale: z.array(z.number()).length(3).optional().describe('Масштаб объекта [sx, sy, sz]')
  }),
  func: async (input): Promise<string> => {
    try {
      const objectRecord = await db.getObject(input.objectUuid)

      if (!objectRecord) {
        return JSON.stringify({
          success: false,
          error: 'Объект не найден',
          message: `Объект с UUID ${input.objectUuid} не найден в библиотеке`
        })
      }

      // Создаем новый объект на основе данных из библиотеки
      const newObject: GFXObjectWithTransform = {
        uuid: uuidv4(), // Новый UUID для экземпляра в сцене
        name: objectRecord.name,
        primitives: objectRecord.objectData.primitives.map(primitive => ({
          ...primitive,
          uuid: uuidv4() // Новые UUID для примитивов
        })),
        ...(input.position && {
          position: input.position as [number, number, number]
        }),
        ...(input.rotation && {
          rotation: input.rotation as [number, number, number]
        }),
        ...(input.scale && {
          scale: input.scale as [number, number, number]
        })
      }

      // Использовать новый метод SceneAPI для добавления объекта
      const result = SceneAPI.addObjectWithTransform(newObject)

      if (!result.success) {
        return JSON.stringify({
          success: false,
          error: result.error,
          message: `Не удалось добавить объект "${objectRecord.name}" в сцену: ${result.error}`
        })
      }

      return JSON.stringify({
        success: true,
        object: newObject,
        sourceObject: {
          uuid: objectRecord.uuid,
          name: objectRecord.name,
          description: objectRecord.description
        },
        objectUuid: result.objectUuid,
        instanceUuid: result.instanceUuid,
        message: `Объект "${objectRecord.name}" добавлен в сцену из библиотеки`
      })

    } catch (error) {
      console.error('Ошибка при добавлении объекта из библиотеки:', error)

      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        message: `Не удалось добавить объект из библиотеки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      })
    }
  }
})
