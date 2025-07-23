/**
 * LangChain инструменты для работы с экземплярами объектов сцены
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { SceneAPI } from '@/features/scene/lib/sceneAPI'

/**
 * Схема валидации для добавления экземпляра объекта
 */
const addInstanceSchema = z.object({
  objectUuid: z.string().min(1, 'Object UUID is required'),
  position: z.array(z.number()).length(3).optional().default([0, 0, 0]),
  rotation: z.array(z.number()).length(3).optional().default([0, 0, 0]),
  scale: z.array(z.number()).length(3).optional().default([1, 1, 1]),
  visible: z.boolean().optional().default(true)
})

/**
 * Инструмент для добавления экземпляра существующего объекта на сцену
 */
export const addObjectInstanceTool = new DynamicStructuredTool({
  name: 'add_object_instance',
  description: `Добавить экземпляр существующего объекта на сцену.
Параметры:
- objectUuid: uuid_объекта_из_сцены (обязательный)
- position: [x, y, z] (опционально, по умолчанию [0, 0, 0])
- rotation: [x, y, z] (опционально, по умолчанию [0, 0, 0] в радианах)
- scale: [x, y, z] (опционально, по умолчанию [1, 1, 1])
- visible: true/false (опционально, по умолчанию true)

Возвращает информацию о созданном экземпляре или ошибку.
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

      // Добавляем экземпляр
      const result = SceneAPI.addObjectInstance(
        validatedParams.objectUuid,
        validatedParams.position as [number, number, number],
        validatedParams.rotation as [number, number, number],
        validatedParams.scale as [number, number, number],
        validatedParams.visible
      )

      if (result.success) {
        return JSON.stringify({
          success: true,
          instanceUuid: result.instanceUuid,
          objectUuid: result.objectUuid,
          parameters: validatedParams,
          message: 'Object instance added successfully'
        })
      } else {
        return JSON.stringify({
          success: false,
          error: result.error
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