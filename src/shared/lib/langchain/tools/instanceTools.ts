/**
 * LangChain инструменты для работы с экземплярами объектов сцены
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { SceneAPI } from '@/features/scene/lib/sceneAPI'
import { placeInstance } from '@/features/scene/lib/placement/ObjectPlacementUtils'
import { useSceneStore } from '@/features/scene/model/sceneStore'

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
  count: z.number().min(1).max(100).optional()
})

/**
 * Инструмент для добавления экземпляра существующего объекта на сцену
 */
export const addObjectInstanceTool = new DynamicStructuredTool({
  name: 'add_object_instance',
  description: `Добавить один или несколько экземпляров существующего объекта на сцену.

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

Возвращает информацию о созданных экземплярах или ошибку.
Перед использованием рекомендуется получить список объектов через get_scene_objects.`,
  schema: addInstanceSchema,
  func: async (input) => {
    try {
      // Валидация уже выполнена схемой
      const validatedParams = input
      
      // Проверяем существование объекта
      if (!SceneAPI.canAddInstance(validatedParams.objectUuid)) {
        return JSON.stringify({
          error: `Object with UUID "${validatedParams.objectUuid}" not found in scene`,
          success: false,
          availableObjects: SceneAPI.getSceneObjects().map(obj => ({
            uuid: obj.uuid,
            name: obj.name
          }))
        })
      }

      // Определяем режим работы и создаем список экземпляров для добавления
      let instancesToCreate: Array<{
        position: [number, number, number]
        rotation: [number, number, number]
        scale: [number, number, number]
        visible: boolean
      }> = []

      if (validatedParams.instances && validatedParams.instances.length > 0) {
        // Режим: массив экземпляров
        instancesToCreate = validatedParams.instances.map(inst => ({
          position: inst.position as [number, number, number],
          rotation: inst.rotation as [number, number, number],
          scale: inst.scale as [number, number, number],
          visible: inst.visible
        }))
      } else if (validatedParams.count && validatedParams.count > 1) {
        // Режим: множественные случайные экземпляры
        // Получаем landscape layer для корректного размещения
        const state = useSceneStore.getState()
        const landscapeLayer = state.layers.find(layer => layer.type === 'landscape')
        
        for (let i = 0; i < validatedParams.count; i++) {
          // Создаем временный экземпляр для использования placeInstance
          const tempInstance = {
            uuid: '', // временное значение
            objectUuid: validatedParams.objectUuid,
            transform: {
              position: [0, 0, 0] as [number, number, number],
              rotation: validatedParams.rotation as [number, number, number],
              scale: validatedParams.scale as [number, number, number]
            },
            visible: validatedParams.visible
          }
          
          // Используем placeInstance для получения правильной позиции
          const placedInstance = placeInstance(tempInstance, { landscapeLayer })
          
          instancesToCreate.push({
            position: placedInstance.transform.position,
            rotation: validatedParams.rotation as [number, number, number],
            scale: validatedParams.scale as [number, number, number],
            visible: validatedParams.visible
          })
        }
      } else {
        // Режим: одиночный экземпляр
        instancesToCreate.push({
          position: validatedParams.position as [number, number, number],
          rotation: validatedParams.rotation as [number, number, number],
          scale: validatedParams.scale as [number, number, number],
          visible: validatedParams.visible
        })
      }

      // Создаем экземпляры
      const results = []
      const errors = []

      for (const instanceParams of instancesToCreate) {
        const result = SceneAPI.addObjectInstance(
          validatedParams.objectUuid,
          instanceParams.position,
          instanceParams.rotation,
          instanceParams.scale,
          instanceParams.visible
        )

        if (result.success) {
          results.push({
            instanceUuid: result.instanceUuid,
            objectUuid: result.objectUuid,
            parameters: instanceParams
          })
        } else {
          errors.push(result.error)
        }
      }

      // Возвращаем результат
      if (results.length > 0) {
        return JSON.stringify({
          success: true,
          instanceCount: results.length,
          instances: results,
          errors: errors.length > 0 ? errors : undefined,
          message: `Successfully created ${results.length} instance(s)${errors.length > 0 ? ` with ${errors.length} error(s)` : ''}`
        })
      } else {
        return JSON.stringify({
          success: false,
          error: 'Failed to create any instances',
          details: errors
        })
      }
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

/**
 * Инструмент для получения информации о существующих экземплярах объекта
 */
export const getObjectInstancesTool = new DynamicStructuredTool({
  name: 'get_object_instances',
  description: `Получить список всех экземпляров указанного объекта.
Параметр: objectUuid - UUID объекта
Возвращает массив экземпляров с их трансформациями и свойствами.`,
  schema: z.object({
    objectUuid: z.string().describe('UUID объекта для получения экземпляров')
  }),
  func: async ({ objectUuid }: { objectUuid: string }) => {
    try {
      if (!objectUuid) {
        return JSON.stringify({
          error: 'Object UUID is required',
          success: false
        })
      }

      const allInstances = SceneAPI.getSceneInstances()
      const objectInstances = allInstances.filter(inst => inst.objectUuid === objectUuid)
      const objectInfo = SceneAPI.findObjectByUuid(objectUuid)

      return JSON.stringify({
        objectUuid,
        objectName: objectInfo?.name || 'Unknown Object',
        instanceCount: objectInstances.length,
        instances: objectInstances,
        success: true
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return JSON.stringify({
        error: `Failed to get object instances: ${errorMessage}`,
        success: false
      })
    }
  }
})