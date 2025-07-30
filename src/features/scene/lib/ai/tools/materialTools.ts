import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import {materialRegistry} from "@/shared/lib/materials";


/**
 * LangChain инструмент для получения списка глобальных материалов
 *
 * @example
 * // Использование в AI:
 * // 1. Сначала получи список материалов:
 * await get_global_materials({})
 *
 * // 2. Затем используй UUID материала в примитиве:
 * await add_new_object({
 *   name: "Деревянный стол",
 *   primitives: [{
 *     type: "box",
 *     geometry: { width: 2, height: 0.1, depth: 1 },
 *     globalMaterialUuid: "wood-material-uuid-from-list"
 *   }]
 * })
 */
export const getGlobalMaterialsTool = new DynamicStructuredTool({
  name: 'get_global_materials',
  description: 'Получает список всех доступных глобальных материалов с их характеристиками. Используй этот инструмент, чтобы узнать какие материалы можно применять к примитивам. ОБЯЗАТЕЛЬНО используй этот инструмент перед созданием объектов с материалами.',
  schema: z.object({
    // Пустая схема - инструмент не требует параметров
  }),
  func: async (): Promise<string> => {
    try {
      const materials = materialRegistry.getAllMaterials()

      const materialsInfo = Object.entries(materials).map(([uuid, material]) => ({
        uuid,
        name: material.name,
      }))

      return JSON.stringify({
        success: true,
        materials: materialsInfo,
        count: materialsInfo.length,
        message: `Доступно ${materialsInfo.length} глобальных материалов`
      })

    } catch (error) {
      console.error('Ошибка при получении глобальных материалов:', error)

      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        message: `Не удалось получить список глобальных материалов: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      })
    }
  }
})

/**
 * LangChain инструмент для поиска материалов по названию или описанию
 */
export const searchGlobalMaterialsTool = new DynamicStructuredTool({
  name: 'search_global_materials',
  description: 'Выполняет поиск глобальных материалов по названию или описанию. Полезно для поиска подходящего материала для конкретного объекта.',
  schema: z.object({
    query: z.string().describe('Поисковый запрос (название или описание материала)')
  }),
  func: async (input): Promise<string> => {
    try {
      const materials = materialRegistry.getAllMaterials()
      const query = input.query.toLowerCase()

      const filteredMaterials = Object.entries(materials)
        .filter(([_, material]) =>
          material.name.toLowerCase().includes(query) ||
          material.description.toLowerCase().includes(query)
        )
        .map(([uuid, material]) => ({
          uuid,
          name: material.name,
          description: material.description,
          color: material.properties.color,
          opacity: material.properties.opacity,
          emissive: material.properties.emissive,
          emissiveIntensity: material.properties.emissiveIntensity,
          roughness: material.properties.roughness,
          metalness: material.properties.metalness,
          castShadow: material.properties.castShadow,
          receiveShadow: material.properties.receiveShadow
        }))

      if (filteredMaterials.length === 0) {
        return JSON.stringify({
          success: true,
          materials: [],
          count: 0,
          message: `По запросу "${input.query}" материалы не найдены`
        })
      }

      return JSON.stringify({
        success: true,
        materials: filteredMaterials,
        count: filteredMaterials.length,
        message: `Найдено ${filteredMaterials.length} материалов по запросу "${input.query}"`
      })

    } catch (error) {
      console.error('Ошибка при поиске глобальных материалов:', error)

      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        message: `Не удалось выполнить поиск материалов: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      })
    }
  }
})
