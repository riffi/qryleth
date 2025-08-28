/**
 * LangChain инструменты для работы с экземплярами объектов сцены
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { SceneAPI } from '../../../lib/sceneAPI'
import { PlacementStrategy } from '../../../lib/placement/ObjectPlacementUtils'

/**
 * Схема валидации для PlaceAroundMetadata в instance tools
 */
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

/**
 * Схема валидации для параметров одного экземпляра
 */
const instanceParamsSchema = z.object({
  position: z.array(z.number()).length(3).optional().default([0, 0, 0]),
  rotation: z.array(z.number()).length(3).optional().default([0, 0, 0]),
  scale: z.array(z.number()).length(3).optional().default([1, 1, 1]),
  visible: z.boolean().optional().default(true)
})

/**
 * Схема валидации для добавления экземпляра объекта (одного или нескольких)
 */
const addInstanceSchema = z.object({
  objectUuid: z.string().min(1, 'Object UUID is required'),
  // Для одного экземпляра
  position: z.array(z.number()).length(3).optional().default([0, 0, 0]),
  rotation: z.array(z.number()).length(3).optional().default([0, 0, 0]),
  scale: z.array(z.number()).length(3).optional().default([1, 1, 1]),
  visible: z.boolean().optional().default(true),
  // Для массового создания - массив параметров экземпляров
  instances: z.array(instanceParamsSchema).optional(),
  // Количество экземпляров для случайного размещения
  count: z.number().min(1).max(100).optional(),
  // Выравнивание по ландшафту (раздельные флаги)
  alignToTerrainHeight: z.boolean().optional().default(true).describe('выравнивать по высоте ландшафта (Y). Если есть bounding box — нижняя грань ставится на поверхность.'),
  alignToTerrainRotation: z.boolean().optional().default(false).describe('автоматически поворачивать объект по нормали поверхности (по умолчанию: выключено).'),
  // Стратегия размещения
  placementStrategy: z.enum(['Random', 'RandomNoCollision', 'PlaceAround']).optional().describe('Стратегия размещения: Random — случайное размещение, RandomNoCollision — избегание коллизий, PlaceAround — размещение вокруг указанного объекта/инстанса (по умолчанию RandomNoCollision)'),
  placementMetadata: PlaceAroundMetadataSchema.optional().describe('Метаданные для PlaceAround стратегии. ОБЯЗАТЕЛЬНЫ при использовании PlaceAround!')
})

/**
 * Инструмент для добавления экземпляра существующего объекта на сцену
 */
export const addObjectInstanceTool = new DynamicStructuredTool({
  name: 'add_object_instance',
  description: `Добавить один или несколько экземпляров существующего объекта на сцену.
BoundingBox объекта учитывается при расчёте позиции и возвращается для каждого экземпляра.

Режимы работы:
1. Одиночный экземпляр: указать только objectUuid и опциональные параметры трансформации
2. Массив экземпляров: указать objectUuid и массив instances с параметрами для каждого экземпляра
3. Множественные случайные экземпляры: указать objectUuid и count для создания заданного количества экземпляров со случайными позициями

Параметры:
- objectUuid: uuid_объекта_из_сцены (обязательный)
- position: [x, y, z] (для одиночного экземпляра, по умолчанию [0, 0, 0])
- rotation: [x, y, z] (для одиночного экземпляра, по умолчанию [0, 0, 0] в радианах)
- scale: [x, y, z] (для одиночного экземпляра, по умолчанию [1, 1, 1])
- visible: true/false (для одиночного экземпляра, по умолчанию true)
- instances: массив объектов с параметрами для каждого экземпляра (position, rotation, scale, visible)
- count: количество экземпляров для случайного размещения (1-100)
- alignToTerrainHeight: true/false (выравнивание по высоте ландшафта; при наличии bounding box нижняя грань ставится на поверхность; по умолчанию true)
- alignToTerrainRotation: true/false (автоповорот по нормали к поверхности; по умолчанию false)

Возвращает информацию о созданных экземплярах или ошибку.
Перед использованием рекомендуется получить список объектов через get_scene_objects.`,
  schema: addInstanceSchema,
  func: async (input) => {
    try {
      const validatedParams = input

      // Дополнительная валидация для PlaceAround стратегии
      if (validatedParams.placementStrategy === 'PlaceAround') {
        if (!validatedParams.placementMetadata) {
          return JSON.stringify({
            error: 'Для стратегии PlaceAround обязательны placementMetadata',
            success: false
          })
        }
      }

      // Определяем количество экземпляров для создания
      let count = 1
      if (validatedParams.instances && validatedParams.instances.length > 0) {
        count = validatedParams.instances.length
      } else if (validatedParams.count && validatedParams.count > 1) {
        count = validatedParams.count
      }

      // Формирование конфигурации размещения
      let placementConfig: { strategy: PlacementStrategy; metadata?: any }

      if (validatedParams.placementStrategy === 'PlaceAround' && validatedParams.placementMetadata) {
        placementConfig = {
          strategy: PlacementStrategy.PlaceAround,
          metadata: validatedParams.placementMetadata
        }
      } else {
        // Выбираем стратегию размещения в зависимости от наличия конкретных позиций
        const strategy = validatedParams.instances && validatedParams.instances.length > 0
          ? PlacementStrategy.Random // Для множественных экземпляров с конкретными параметрами
          : (validatedParams.placementStrategy === 'Random' 
              ? PlacementStrategy.Random 
              : PlacementStrategy.RandomNoCollision) // Для случайного размещения
        
        placementConfig = { strategy }
      }

      // Используем новый унифицированный метод addInstances
      const result = SceneAPI.addInstances(
        validatedParams.objectUuid,
        undefined, // layerId - позволим API определить автоматически
        count,
        placementConfig
      )

      return JSON.stringify(result)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return JSON.stringify({
          error: 'Parameter validation failed',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          })),
          success: false
        })
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return JSON.stringify({
        error: `Failed to add object instance: ${errorMessage}`,
        success: false
      })
    }
  }
})

/**
 * Инструмент для предварительной проверки возможности добавления экземпляра
 */
export const canAddInstanceTool = new DynamicStructuredTool({
  name: 'can_add_instance',
  description: `Проверить, можно ли добавить экземпляр объекта с указанным UUID.
Параметр: objectUuid - UUID объекта
Возвращает информацию о возможности добавления экземпляра и детали объекта.`,
  schema: z.object({
    objectUuid: z.string().describe('UUID объекта для проверки')
  }),
  func: async ({ objectUuid }: { objectUuid: string }) => {
    try {
      if (!objectUuid) {
        return JSON.stringify({
          error: 'Object UUID is required',
          success: false
        })
      }

      const canAdd = SceneAPI.canAddInstance(objectUuid)
      const objectInfo = SceneAPI.findObjectByUuid(objectUuid)

      return JSON.stringify({
        canAdd,
        objectUuid,
        objectExists: objectInfo !== null,
        objectInfo: objectInfo ? {
          name: objectInfo.name,
          layerId: objectInfo.layerId,
          visible: objectInfo.visible,
          primitiveCount: objectInfo.primitives.length
        } : null,
        success: true
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return JSON.stringify({
        error: `Failed to check instance availability: ${errorMessage}`,
        success: false
      })
    }
  }
})

