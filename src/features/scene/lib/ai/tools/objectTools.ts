import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import type { GFXObjectWithTransform } from '@/entities/object/model/types'
import type { GfxPrimitive } from '@/entities'
import { generatePrimitiveName } from '@/entities/primitive'
import { SceneAPI } from '@/features/scene/lib/sceneAPI.ts'
import { transformBoundingBox } from '@/shared/lib/geometry/boundingBoxUtils'

// Схемы валидации для геометрии примитивов
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

// Схема для общих свойств примитива
const PrimitiveCommonSchema = z.object({
  // Читаемое имя примитива. Может отсутствовать, тогда будет сгенерировано
  // автоматически
  name: z.string().min(1).optional(),
  // Материал примитива - поддерживает несколько способов задания
  material: z.object({
    color: z.string(),
    opacity: z.number().min(0).max(1).optional(),
    emissive: z.string().optional(),
    emissiveIntensity: z.number().min(0).optional()
  }).optional().describe("Прямые свойства материала (для обратной совместимости)"),
  // Ссылка на материал объекта по UUID
  objectMaterialUuid: z.string().uuid().optional().describe("UUID материала объекта"),
  // Ссылка на глобальный материал по UUID (используй get_global_materials для получения списка)
  globalMaterialUuid: z.string().uuid().optional().describe("UUID глобального материала"),
  // Transform properties
  transform: z.object({
    position: z.array(z.number()).length(3).optional(),
    rotation: z.array(z.number()).length(3).optional(),
    scale: z.array(z.number()).length(3).optional()
  }).optional()
})

// Дискриминированная схема для примитива
const PrimitiveSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('box'), geometry: BoxGeometrySchema }).merge(PrimitiveCommonSchema),
  z.object({ type: z.literal('sphere'), geometry: SphereGeometrySchema }).merge(PrimitiveCommonSchema),
  z.object({ type: z.literal('cylinder'), geometry: CylinderGeometrySchema }).merge(PrimitiveCommonSchema),
  z.object({ type: z.literal('cone'), geometry: ConeGeometrySchema }).merge(PrimitiveCommonSchema),
  z.object({ type: z.literal('pyramid'), geometry: PyramidGeometrySchema }).merge(PrimitiveCommonSchema),
  z.object({ type: z.literal('plane'), geometry: PlaneGeometrySchema }).merge(PrimitiveCommonSchema),
  z.object({ type: z.literal('torus'), geometry: TorusGeometrySchema }).merge(PrimitiveCommonSchema)
])

// Схема для материала объекта
const ObjectMaterialSchema = z.object({
  uuid: z.string().uuid(),
  name: z.string().describe("Название материала"),
  description: z.string().optional(),
  color: z.string().describe("Цвет материала в формате hex"),
  opacity: z.number().min(0).max(1).optional(),
  emissive: z.string().optional().describe("Цвет свечения в формате hex"),
  emissiveIntensity: z.number().min(0).optional(),
  roughness: z.number().min(0).max(1).optional(),
  metalness: z.number().min(0).max(1).optional(),
  castShadow: z.boolean().optional(),
  receiveShadow: z.boolean().optional()
})

// Схема валидации для объекта
const ObjectSchema = z.object({
  name: z.string().describe("Имя объекта на русском"),
  primitives: z.array(PrimitiveSchema),
  // Материалы объекта - используются примитивами через objectMaterialUuid
  materials: z.array(ObjectMaterialSchema).optional().describe("Массив материалов объекта"),
  position: z.array(z.number()).length(3).optional(),
  rotation: z.array(z.number()).length(3).optional(),
  scale: z.array(z.number()).length(3).optional()
})

/**
 * LangChain инструмент для добавления нового объекта в сцену
 * Адаптированный из существующего add_new_object инструмента.
 * BoundingBox объекта вычисляется внутри SceneAPI при добавлении,
 * поэтому здесь достаточно передать описание примитивов и трансформаций.
 *
 * @example
 * // СПОСОБ 1: Использование глобальных материалов (рекомендуется)
 * // Сначала получи список материалов:
 * const materials = await get_global_materials({})
 * // Затем создай объект с глобальным материалом:
 * await add_new_object({
 *   name: "Деревянный стул",
 *   primitives: [{
 *     type: "box",
 *     geometry: { width: 0.5, height: 1, depth: 0.5 },
 *     globalMaterialUuid: "wood-uuid-from-materials-list"
 *   }]
 * })
 *
 * @example
 * // СПОСОБ 2: Создание материалов объекта
 * await add_new_object({
 *   name: "Цветной куб",
 *   materials: [{
 *     uuid: "custom-red-material",
 *     name: "Красный пластик",
 *     color: "#ff0000",
 *     opacity: 0.8,
 *     roughness: 0.7
 *   }],
 *   primitives: [{
 *     type: "box",
 *     geometry: { width: 1, height: 1, depth: 1 },
 *     objectMaterialUuid: "custom-red-material"
 *   }]
 * })
 *
 * @example
 * // СПОСОБ 3: Прямое задание материала (устаревший способ)
 * await add_new_object({
 *   name: "Синий шар",
 *   primitives: [{
 *     type: "sphere",
 *     geometry: { radius: 0.5 },
 *     material: {
 *       color: "#0000ff",
 *       opacity: 1.0
 *     }
 *   }]
 * })
 */
export const createAddNewObjectTool = () => {
  return new DynamicStructuredTool({
    name: 'add_new_object',
    description: 'Добавляет новый объект в текущую сцену. Создает новый объект из примитивов и размещает его в указанной позиции. Материалы можно задавать тремя способами: 1) прямо в primitive.material (старый способ), 2) через globalMaterialUuid (используй get_global_materials), 3) создав материалы на уровне объекта в поле materials и ссылаясь на них через objectMaterialUuid',
    schema: ObjectSchema,
    func: async (input): Promise<string> => {
      try {
        // Валидация входных данных уже выполнена схемой
        const validatedInput = input

        // Преобразование примитивов в GfxPrimitive формат
        const primitives: GfxPrimitive[] = validatedInput.primitives.map((primitive, index) => {
          const basePrimitive = {
            uuid: uuidv4(),
            type: primitive.type,
            name: primitive.name && primitive.name.trim() !== ''
              ? primitive.name
              : generatePrimitiveName(primitive.type, index + 1),
            geometry: primitive.geometry,
            // Материал (старый формат для обратной совместимости)
            ...(primitive.material && { material: primitive.material }),
            // Новая система материалов
            ...(primitive.objectMaterialUuid && { objectMaterialUuid: primitive.objectMaterialUuid }),
            ...(primitive.globalMaterialUuid && { globalMaterialUuid: primitive.globalMaterialUuid }),
            // Трансформации
            ...(primitive.transform && { transform: primitive.transform })
          }

          return basePrimitive as GfxPrimitive
        })

        // Создание объекта в формате GFXObjectWithTransform
        let newObject: GFXObjectWithTransform = {
          uuid: uuidv4(),
          name: validatedInput.name,
          primitives,
          // Материалы объекта
          ...(validatedInput.materials && { materials: validatedInput.materials }),
          ...(validatedInput.position && {
            position: validatedInput.position as [number, number, number]
          }),
          ...(validatedInput.rotation && {
            rotation: validatedInput.rotation as [number, number, number]
          }),
          ...(validatedInput.scale && {
            scale: validatedInput.scale as [number, number, number]
          }),
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
      const filteredObjects = await SceneAPI.searchObjectsInLibrary(input.query)

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
  description: 'Добавляет существующий объект из библиотеки в текущую сцену. BoundingBox рассчитывается автоматически и возвращается в ответе.',
  schema: z.object({
    objectUuid: z.string().describe('UUID объекта из библиотеки'),
    position: z.array(z.number()).length(3).optional().describe('Позиция объекта в сцене [x, y, z]'),
    rotation: z.array(z.number()).length(3).optional().describe('Поворот объекта [rx, ry, rz] в радианах'),
    scale: z.array(z.number()).length(3).optional().describe('Масштаб объекта [sx, sy, sz]')
  }),
  func: async (input): Promise<string> => {
    try {
      const result = await SceneAPI.addObjectFromLibrary(
        input.objectUuid,
        'objects',
        {
          position: input.position as [number, number, number] | undefined,
          rotation: input.rotation as [number, number, number] | undefined,
          scale: input.scale as [number, number, number] | undefined
        }
      )

      if (!result.success) {
        return JSON.stringify({
          success: false,
          error: result.error,
          message: `Не удалось добавить объект с UUID ${input.objectUuid} в сцену`
        })
      }

      const objectInfo = result.objectUuid
        ? SceneAPI.findObjectByUuid(result.objectUuid)
        : null
      const bbox = objectInfo?.boundingBox
        ? transformBoundingBox(objectInfo.boundingBox, {
            position: input.position as [number, number, number] | undefined,
            rotation: input.rotation as [number, number, number] | undefined,
            scale: input.scale as [number, number, number] | undefined
          })
        : null

      return JSON.stringify({
        success: true,
        objectUuid: result.objectUuid,
        instanceUuid: result.instanceUuid,
        boundingBox: bbox,
        message: `Объект с UUID ${input.objectUuid} добавлен в сцену из библиотеки`
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
