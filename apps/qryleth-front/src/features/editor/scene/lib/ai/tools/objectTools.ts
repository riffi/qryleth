import {DynamicStructuredTool} from '@langchain/core/tools'
import {z} from 'zod'
import {v4 as uuidv4} from 'uuid'
import type {GfxObject} from '@/entities/object/model/types'
import type {GfxPrimitive} from '@/entities'
import {generatePrimitiveName} from '@/entities/primitive'
import {SceneAPI} from '@/features/editor/scene/lib/sceneAPI.ts'
import {PlacementStrategy} from "@/features/editor/scene/lib/placement/ObjectPlacementUtils.ts";

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
}).describe("Цилиндр по умолчанию ориентирован вертикально (ось Y), плоской гранью вверх. Для горизонтального положения используй transform: { rotation: [Math.PI/2, 0, 0] }")

const ConeGeometrySchema = z.object({
  radius: z.number().positive(),
  height: z.number().positive(),
  radialSegments: z.number().int().positive().optional()
}).describe("Конус по умолчанию ориентирован вертикально (ось Y), острием вверх, основанием вниз. Для изменения ориентации используй transform: { rotation: [...] }")

const PyramidGeometrySchema = z.object({
  baseSize: z.number().positive(),
  height: z.number().positive()
}).describe("Пирамида по умолчанию ориентирована вертикально (ось Y), острием вверх, основанием вниз. Для изменения ориентации используй transform: { rotation: [...] }")

const PlaneGeometrySchema = z.object({
  width: z.number().positive(),
  height: z.number().positive()
}).describe("Плоскость по умолчанию лежит в плоскости XY (горизонтально). Для вертикального положения используй transform: { rotation: [Math.PI/2, 0, 0] }")

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
  // ОБЯЗАТЕЛЬНАЯ ссылка на материал объекта по UUID! Создай материал в поле materials объекта и укажи его uuid здесь
  objectMaterialUuid: z.string().optional().describe("ОБЯЗАТЕЛЬНЫЙ UUID материала объекта из поля materials! Без этого примитив будет невидимым!"),
  // Альтернатива - ссылка на глобальный материал по UUID (используй get_global_materials для получения списка)
  globalMaterialUuid: z.string().optional().describe("UUID глобального материала (альтернатива objectMaterialUuid)"),
  // Transform properties
  transform: z.object({
    position: z.array(z.number()).length(3).optional().describe("Позиция примитива [x, y, z]"),
    rotation: z.array(z.number()).length(3).optional().describe("Поворот примитива [rx, ry, rz] в радианах. ВАЖНО: большинство примитивов (конус, цилиндр, пирамида) по умолчанию смотрят вверх по оси Y"),
    scale: z.array(z.number()).length(3).optional().describe("Масштаб примитива [sx, sy, sz]")
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

// Схема для материала объекта, соответствующая интерфейсу GfxMaterial
const ObjectMaterialSchema = z.object({
  uuid: z.string().describe('UUID материала'),
  name: z.string().describe('Название материала'),
  type: z
    .enum(['metal', 'dielectric', 'glass', 'emissive', 'custom'])
    .optional()
    .describe('Тип материала'),
  description: z.string().optional().describe('Описание материала'),
  isGlobal: z.boolean().optional().describe('Флаг глобального материала'),
  properties: z
    .object({
      color: z.string().describe('Цвет материала в формате hex'),
      opacity: z.number().min(0).max(1).optional(),
      transparent: z.boolean().optional(),
      metalness: z.number().min(0).max(1).optional(),
      roughness: z.number().min(0).max(1).optional(),
      emissive: z.string().optional().describe('Цвет свечения в формате hex'),
      emissiveIntensity: z.number().min(0).optional(),
      ior: z.number().min(1).max(3).optional(),
      envMapIntensity: z.number().min(0).optional(),
      side: z.enum(['front', 'back', 'double']).optional(),
      alphaTest: z.number().min(0).max(1).optional(),
      castShadow: z.boolean().optional(),
      receiveShadow: z.boolean().optional()
    })
    .describe('Свойства материала')
})

// Схема для группы примитивов
const PrimitiveGroupSchema = z.object({
  uuid: z.string().describe('UUID группы'),
  name: z.string().describe('Название группы'),
  parentGroupUuid: z.string().optional().describe('UUID родительской группы для иерархии'),
  transform: z.object({
    position: z.array(z.number()).length(3).optional().describe('Позиция группы [x, y, z]'),
    rotation: z.array(z.number()).length(3).optional().describe('Поворот группы [rx, ry, rz] в радианах'),
    scale: z.array(z.number()).length(3).optional().describe('Масштаб группы [sx, sy, sz]')
  }).optional().describe('Трансформация группы для позиционирования и масштабирования')
})

// Схема валидации для объекта (данные самого объекта)
const ObjectSchema = z.object({
  name: z.string().describe("Имя объекта на русском"),
  primitives: z.array(PrimitiveSchema).describe("Массив примитивов объекта. КАЖДЫЙ примитив ОБЯЗАТЕЛЬНО должен содержать objectMaterialUuid или globalMaterialUuid"),
  // Материалы объекта - используются примитивами через objectMaterialUuid
  materials: z.array(ObjectMaterialSchema).describe("ОБЯЗАТЕЛЬНЫЙ массив материалов объекта! Создай минимум один материал с uuid и укажи этот uuid в objectMaterialUuid у примитивов. Без материалов объект будет невидимым!"),
  // Группы примитивов (опционально)
  primitiveGroups: z.record(z.string(), PrimitiveGroupSchema).optional().describe("Опциональные группы примитивов для организации иерархии. Ключ - UUID группы"),
  // Привязки примитивов к группам (опционально)
  primitiveGroupAssignments: z.record(z.string(), z.string()).optional().describe("Привязка примитивов к группам. Ключ - UUID примитива, значение - UUID группы"),
})

// Схема валидации для PlaceAroundMetadata
const PlaceAroundMetadataSchema = z.object({
  // === ЦЕЛЕВЫЕ ОБЪЕКТЫ (взаимоисключающие параметры) ===
  targetInstanceUuid: z.string().optional().describe('UUID конкретного инстанса, вокруг которого размещать (приоритет 1)'),
  targetObjectUuid: z.string().optional().describe('UUID объекта, вокруг всех инстансов которого размещать (приоритет 2)'),
  
  // === РАССТОЯНИЯ (обязательные параметры) ===
  minDistance: z.number().positive().describe('минимальное расстояние от грани target до грани нового объекта (единицы мира)'),
  maxDistance: z.number().positive().describe('максимальное расстояние от грани target до грани нового объекта (единицы мира)'),
  
  // === ПАРАМЕТРЫ РАСПРЕДЕЛЕНИЯ (опциональные) ===
  angleOffset: z.number().optional().describe('начальный угол в радианах (по умолчанию: 0)'),
  distributeEvenly: z.boolean().optional().describe('равномерно по кругу или случайно (по умолчанию: true)'),
  onlyHorizontal: z.boolean().optional().describe('только горизонтально Y=const или 3D (по умолчанию: true)')
}).refine(
  (data) => data.targetInstanceUuid || data.targetObjectUuid,
  { message: "Требуется указать targetInstanceUuid ИЛИ targetObjectUuid" }
).refine(
  (data) => data.minDistance < data.maxDistance,
  { message: "minDistance должно быть меньше maxDistance" }
)

// Схема стратегии размещения с дискриминированными типами (для будущего использования)
// const PlacementStrategyConfigSchema = z.discriminatedUnion('strategy', [
//   z.object({ strategy: z.literal('Random') }),
//   z.object({ strategy: z.literal('RandomNoCollision') }),
//   z.object({ 
//     strategy: z.literal('PlaceAround'),
//     metadata: PlaceAroundMetadataSchema
//   })
// ])

// Расширенная схема для входных параметров инструмента add_new_object
// Добавляет параметры размещения и создания нескольких экземпляров
const AddNewObjectInputSchema = ObjectSchema.extend({
  layerId: z.string().optional().describe('ID слоя для размещения (по умолчанию "objects")'),
  count: z.number().min(1).max(20).optional().describe('Количество экземпляров для создания (по умолчанию 1)'),
  placementStrategy: z.enum(['Random', 'RandomNoCollision', 'PlaceAround']).optional().describe('Стратегия размещения: Random — случайное размещение, RandomNoCollision — избегание коллизий, PlaceAround — размещение вокруг указанного объекта/инстанса (по умолчанию Random)'),
  placementMetadata: PlaceAroundMetadataSchema.optional().describe('Метаданные для PlaceAround стратегии. ОБЯЗАТЕЛЬНЫ при использовании PlaceAround!')
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
 * // СПОСОБ 2: Создание материалов объекта (ОБЯЗАТЕЛЬНЫЙ подход!)
 * await add_new_object({
 *   name: "Цветной куб",
 *   materials: [{
 *     uuid: "custom-red-material",
 *     name: "Красный пластик",
 *     properties: {
 *       color: "#ff0000",
 *       opacity: 0.8,
 *       roughness: 0.7
 *     }
 *   }],
 *   primitives: [{
 *     type: "box",
 *     geometry: { width: 1, height: 1, depth: 1 },
 *     objectMaterialUuid: "custom-red-material"  // ОБЯЗАТЕЛЬНО указать!
 *   }]
 * })
 *
 * @example
 * // Пример с поворотом примитивов (ВАЖНО: примитивы изначально смотрят вверх!)
 * await add_new_object({
 *   name: "Лежащий цилиндр",
 *   materials: [{
 *     uuid: "gray-material",
 *     name: "Серый металл",
 *     properties: { color: "#808080", metalness: 0.8, roughness: 0.2 }
 *   }],
 *   primitives: [{
 *     type: "cylinder",
 *     geometry: { radiusTop: 0.5, radiusBottom: 0.5, height: 2 },
 *     objectMaterialUuid: "gray-material",
 *     transform: {
 *       rotation: [Math.PI/2, 0, 0]  // Поворот на 90° по X для горизонтального положения
 *     }
 *   }]
 * })
 *
 * @example
 * // Пример с группировкой примитивов в иерархию
 * await add_new_object({
 *   name: "Дом с группами",
 *   materials: [{
 *     uuid: "brick-material",
 *     name: "Кирпич",
 *     properties: { color: "#8B4513", roughness: 0.8 }
 *   }, {
 *     uuid: "roof-material",
 *     name: "Крыша",
 *     properties: { color: "#654321", roughness: 0.9 }
 *   }],
 *   primitives: [{
 *     type: "box",
 *     geometry: { width: 4, height: 3, depth: 4 },
 *     objectMaterialUuid: "brick-material"
 *   }, {
 *     type: "pyramid",
 *     geometry: { baseSize: 4.5, height: 2 },
 *     objectMaterialUuid: "roof-material",
 *     transform: { position: [0, 2.5, 0] }
 *   }],
 *   primitiveGroups: {
 *     "foundation-group": {
 *       uuid: "foundation-group",
 *       name: "Фундамент",
 *       visible: true
 *     },
 *     "walls-group": {
 *       uuid: "walls-group",
 *       name: "Стены",
 *       visible: true,
 *       parentGroupUuid: "foundation-group"
 *     },
 *     "roof-group": {
 *       uuid: "roof-group",
 *       name: "Крыша",
 *       visible: true
 *     }
 *   },
 *   primitiveGroupAssignments: {
 *     // UUID примитива-коробки -> группа стен
 *     // UUID примитива-пирамиды -> группа крыши
 *   }
 * })
 *
 */
/**
 * Создает LangChain-инструмент add_new_object для добавления нового объекта в сцену.
 * Поддерживает создание нескольких экземпляров и стратегию размещения.
 * Параметры инструмента: layerId (слой), count (количество), placementStrategy (стратегия).
 */
export const createAddNewObjectTool = () => {
  return new DynamicStructuredTool({
    name: 'add_new_object',
    description: 'Добавляет новый объект в текущую сцену. Поддерживает множественные экземпляры и выбор стратегии размещения. ОБЯЗАТЕЛЬНО создай материалы для объекта в поле materials с уникальными UUID, затем каждый примитив должен ссылаться на материал через objectMaterialUuid. Если не указать материалы — объект будет невидимым! ВАЖНО: примитивы имеют изначальную ориентацию — конус, цилиндр, пирамида смотрят вверх по оси Y, плоскость лежит горизонтально. Используй поле rotation для изменения ориентации при необходимости. ПОДДЕРЖИВАЕТ ГРУППИРОВКУ: можешь создавать иерархические группы примитивов для лучшей организации сложных объектов.',
    schema: AddNewObjectInputSchema,
    verboseParsingErrors: true,

    func: async (input): Promise<string> => {
      try {
        // Валидация входных данных уже выполнена схемой
        const validatedInput = input

        // Дополнительная валидация для PlaceAround стратегии
        if (validatedInput.placementStrategy === 'PlaceAround') {
          if (!validatedInput.placementMetadata) {
            return JSON.stringify({
              success: false,
              error: 'Для стратегии PlaceAround обязательны placementMetadata',
              message: 'При использовании PlaceAround необходимо указать placementMetadata с targetInstanceUuid или targetObjectUuid'
            })
          }
        }

        // Преобразование примитивов в GfxPrimitive формат
        const primitives: GfxPrimitive[] = validatedInput.primitives.map((primitive, index) => {
          const basePrimitive = {
            uuid: uuidv4(),
            type: primitive.type,
            name: primitive.name && primitive.name.trim() !== ''
              ? primitive.name
              : generatePrimitiveName(primitive.type, index + 1),
            geometry: primitive.geometry,
            // Новая система материалов
            ...(primitive.objectMaterialUuid && { objectMaterialUuid: primitive.objectMaterialUuid }),
            ...(primitive.globalMaterialUuid && { globalMaterialUuid: primitive.globalMaterialUuid }),
            // Трансформации
            ...(primitive.transform && { transform: primitive.transform })
          }

          return basePrimitive as GfxPrimitive
        })

        // Создание объекта в формате GfxObject
        const materials = validatedInput.materials?.map(mat => ({
          uuid: mat.uuid,
          name: mat.name,
          type: mat.type ?? 'custom',
          description: mat.description,
          isGlobal: mat.isGlobal ?? false,
          properties: {
            color: mat.properties.color,
            opacity: mat.properties.opacity,
            transparent:
              mat.properties.transparent ??
              (mat.properties.opacity !== undefined && mat.properties.opacity < 1),
            metalness: mat.properties.metalness,
            roughness: mat.properties.roughness,
            emissive: mat.properties.emissive,
            emissiveIntensity: mat.properties.emissiveIntensity,
            ior: mat.properties.ior,
            envMapIntensity: mat.properties.envMapIntensity,
            side: mat.properties.side,
            alphaTest: mat.properties.alphaTest,
            castShadow: mat.properties.castShadow,
            receiveShadow: mat.properties.receiveShadow
          }
        }))

        const newObject: GfxObject = {
          uuid: uuidv4(),
          name: validatedInput.name,
          primitives,
          ...(materials && { materials }),
          ...(validatedInput.primitiveGroups && { primitiveGroups: validatedInput.primitiveGroups }),
          ...(validatedInput.primitiveGroupAssignments && { primitiveGroupAssignments: validatedInput.primitiveGroupAssignments }),
        }

        // Формирование конфигурации размещения
        let placementConfig: { strategy: PlacementStrategy; metadata?: any } = { strategy: validatedInput.placementStrategy || PlacementStrategy.RandomNoCollision }
        
        if (validatedInput.placementStrategy === 'PlaceAround' && validatedInput.placementMetadata) {
          placementConfig = {
            strategy: PlacementStrategy.PlaceAround,
            metadata: validatedInput.placementMetadata
          }
        }

        // Используем новый унифицированный метод createObject с поддержкой количества и стратегии размещения
        const result = SceneAPI.createObject(
          newObject,
          validatedInput.layerId || 'objects',
          validatedInput.count || 1,
          placementConfig
        )

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
          count: validatedInput.count || 1,
          placementStrategy: validatedInput.placementStrategy || 'Random',
          message: `Объект "${validatedInput.name}" создан с ${primitives.length} примитивами (${validatedInput.count || 1} экземпляр(а), стратегия: ${validatedInput.placementStrategy || 'Random'})`
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
  description: 'Добавляет существующий объект из библиотеки в текущую сцену с использованием новой унифицированной архитектуры размещения. Поддерживает создание множественных экземпляров и стратегическое размещение.',
  schema: z.object({
    objectUuid: z.string().describe('UUID объекта из библиотеки'),
    layerId: z.string().optional().describe('ID слоя для размещения (по умолчанию "objects")'),
    count: z.number().min(1).max(20).optional().describe('Количество экземпляров для создания (по умолчанию 1)'),
    placementStrategy: z.enum(['Random', 'RandomNoCollision', 'PlaceAround']).optional().describe('Стратегия размещения: Random - случайное размещение, RandomNoCollision - избегание коллизий, PlaceAround - размещение вокруг указанного объекта/инстанса (по умолчанию Random)'),
    placementMetadata: PlaceAroundMetadataSchema.optional().describe('Метаданные для PlaceAround стратегии. ОБЯЗАТЕЛЬНЫ при использовании PlaceAround!')
  }),
  func: async (input): Promise<string> => {
    try {
      // Дополнительная валидация для PlaceAround стратегии
      if (input.placementStrategy === 'PlaceAround') {
        if (!input.placementMetadata) {
          return JSON.stringify({
            success: false,
            error: 'Для стратегии PlaceAround обязательны placementMetadata',
            message: 'При использовании PlaceAround необходимо указать placementMetadata с targetInstanceUuid или targetObjectUuid'
          })
        }
      }

      // Формирование конфигурации размещения
      let placementConfig: { strategy: PlacementStrategy; metadata?: any } = { strategy: input.placementStrategy || PlacementStrategy.RandomNoCollision }
      
      if (input.placementStrategy === 'PlaceAround' && input.placementMetadata) {
        placementConfig = {
          strategy: PlacementStrategy.PlaceAround,
          metadata: input.placementMetadata
        }
      }

      // Используем новую сигнатуру addObjectFromLibrary
      const result = await SceneAPI.addObjectFromLibrary(
        input.objectUuid,
        input.layerId || 'objects',
        input.count || 1,
        placementConfig
      )

      if (!result.success) {
        return JSON.stringify({
          success: false,
          error: result.error,
          message: `Не удалось добавить объект с UUID ${input.objectUuid} в сцену`
        })
      }

      return JSON.stringify({
        success: true,
        objectUuid: result.objectUuid,
        instanceUuid: result.instanceUuid,
        count: input.count || 1,
        placementStrategy: input.placementStrategy || 'Random',
        message: `Объект с UUID ${input.objectUuid} добавлен в сцену из библиотеки (${input.count || 1} экземпляров)`
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
