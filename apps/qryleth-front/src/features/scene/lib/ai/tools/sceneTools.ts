/**
 * LangChain инструменты для работы со сценой
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { SceneAPI } from '../../../lib/sceneAPI'

/**
 * Инструмент для получения списка объектов сцены
 */
export const getSceneObjectsTool = new DynamicStructuredTool({
  name: 'get_scene_objects',
  description: `Получить информацию обо всех объектах в текущей сцене. 
Возвращает список объектов с их основными характеристиками:
- uuid: уникальный идентификатор объекта
- name: название объекта  
- layerId: идентификатор слоя, на котором находится объект
- visible: видимость объекта
- primitiveCount: количество примитивов в объекте
- primitiveTypes: типы примитивов (box, sphere, cylinder и т.д.)
- hasInstances: есть ли экземпляры этого объекта на сцене
- instanceCount: количество экземпляров

Также возвращает общую статистику сцены и информацию о слоях.`,
  schema: z.object({}),
  func: async (input) => {
    try {
      // Инструмент не требует параметров, но LangChain может передать пустую строку
      const sceneOverview = SceneAPI.getSceneOverview()
      
      // Форматируем результат для удобного чтения агентом
      const result = {
        scene: {
          name: sceneOverview.sceneName,
          totalObjects: sceneOverview.totalObjects,
          totalInstances: sceneOverview.totalInstances
        },
        layers: sceneOverview.layers,
        objects: sceneOverview.objects,
        instances: sceneOverview.instances
      }

      return JSON.stringify(result, null, 2)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return JSON.stringify({
        error: `Failed to get scene objects: ${errorMessage}`,
        success: false
      })
    }
  }
})

/**
 * Инструмент для получения статистики сцены
 */
export const getSceneStatsTool = new DynamicStructuredTool({
  name: 'get_scene_stats',
  description: `Получить статистику текущей сцены:
- Общее количество объектов, экземпляров и слоев
- Количество видимых объектов, экземпляров и слоев  
- Список всех типов примитивов, используемых в сцене

Полезно для быстрого анализа состояния сцены.`,
  schema: z.object({}),
  func: async (input) => {
    try {
      const stats = SceneAPI.getSceneStats()
      return JSON.stringify(stats, null, 2)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return JSON.stringify({
        error: `Failed to get scene stats: ${errorMessage}`,
        success: false
      })
    }
  }
})

/**
 * Инструмент для поиска объекта по имени
 */
export const findObjectByNameTool = new DynamicStructuredTool({
  name: 'find_object_by_name',
  description: `Найти объект в сцене по его имени или части имени. 
Поиск нечувствителен к регистру.
Параметр: {"name": "название объекта или его часть"}
Возвращает информацию о первом найденном объекте или null если объект не найден.`,
  schema: z.object({
    name: z.string().describe('Название объекта или его часть для поиска')
  }),
  func: async ({ name }: { name: string }) => {
    try {
      const searchName = name
      
      if (!searchName) {
        return JSON.stringify({
          error: 'Search name is required',
          success: false
        })
      }

      const foundObject = SceneAPI.findObjectByName(searchName)
      
      if (!foundObject) {
        return JSON.stringify({
          result: null,
          message: `No object found with name containing "${searchName}"`
        })
      }

      // Получаем дополнительную информацию об объекте
      const sceneObjects = SceneAPI.getSceneObjects()
      const objectInfo = sceneObjects.find(obj => obj.uuid === foundObject.uuid)

      return JSON.stringify({
        result: {
          ...foundObject,
          ...objectInfo
        },
        success: true
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return JSON.stringify({
        error: `Failed to find object: ${errorMessage}`,
        success: false
      })
    }
  }
})

/**
 * Инструмент для поиска объекта по UUID
 */
export const findObjectByUuidTool = new DynamicStructuredTool({
  name: 'find_object_by_uuid',
  description: `Найти объект в сцене по его точному UUID.
Параметр: {"uuid": "точный UUID объекта"}
Возвращает полную информацию об объекте или null если объект не найден.`,
  schema: z.object({
    uuid: z.string().describe('UUID объекта для поиска')
  }),
  func: async ({ uuid }: { uuid: string }) => {
    try {
      if (!uuid) {
        return JSON.stringify({
          error: 'Object UUID is required',
          success: false
        })
      }

      const foundObject = SceneAPI.findObjectByUuid(uuid)
      
      if (!foundObject) {
        return JSON.stringify({
          result: null,
          message: `No object found with UUID "${uuid}"`
        })
      }

      // Получаем дополнительную информацию об объекте
      const sceneObjects = SceneAPI.getSceneObjects()
      const objectInfo = sceneObjects.find(obj => obj.uuid === foundObject.uuid)

      return JSON.stringify({
        result: {
          ...foundObject,
          ...objectInfo
        },
        success: true
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return JSON.stringify({
        error: `Failed to find object: ${errorMessage}`,
        success: false
      })
    }
  }
})