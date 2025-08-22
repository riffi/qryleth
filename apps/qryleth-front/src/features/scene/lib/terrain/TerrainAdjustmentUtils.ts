/**
 * Универсальные утилиты для выравнивания объектов по террейну
 * Убирают дублирование логики между различными компонентами
 */

import { useSceneStore } from '../../model/sceneStore'
import { SceneAPI } from '../sceneAPI'
import { notifications } from '@mantine/notifications'
import type { SceneLayer } from '@/entities/scene/types'

const DEBUG = (import.meta as any)?.env?.MODE !== 'production'

/**
 * Параметры для выравнивания объектов по террейну
 */
export interface TerrainAdjustmentOptions {
  /** ID созданного слоя террейна */
  layerId: string
  /** Максимальное количество попыток выравнивания */
  maxAttempts?: number
  /** Задержка между попытками в мс */
  retryDelay?: number
  /** Показывать ли уведомления об успехе */
  showSuccessNotification?: boolean
  /** Показывать ли уведомления об ошибках */
  showErrorNotification?: boolean
}

/**
 * Результат выравнивания объектов
 */
export interface TerrainAdjustmentResult {
  success: boolean
  adjustedCount?: number
  error?: string
  terrainType?: string
}

/**
 * Универсальная функция для выравнивания объектов по созданному террейну.
 * Автоматически определяет тип террейна и использует подходящую стратегию выравнивания.
 * Поддерживает retry-логику для асинхронной загрузки данных heightmap.
 * 
 * @param options - параметры выравнивания
 * @returns Promise с результатом выравнивания
 */
export async function adjustObjectsForCreatedTerrain(
  options: TerrainAdjustmentOptions
): Promise<TerrainAdjustmentResult> {
  const {
    layerId,
    maxAttempts = 15,
    retryDelay = 200,
    showSuccessNotification = true,
    showErrorNotification = true
  } = options

  if (DEBUG) console.log('🗻 Starting terrain adjustment for layer:', layerId)

  const attemptAdjustment = async (attempt = 1): Promise<TerrainAdjustmentResult> => {
    try {
      const currentLayer = useSceneStore.getState().layers.find(l => l.id === layerId)
      
      if (DEBUG) console.log(`🗻 Adjustment attempt ${attempt}/${maxAttempts} for layer:`, currentLayer?.terrain?.source.kind || 'legacy')

      // Проверяем наличие terrain данных (новая архитектура) или noiseData (legacy)
      const hasTerrainData = currentLayer?.terrain || currentLayer?.noiseData
      
      if (hasTerrainData) {
        try {
          // Определяем тип террейна для выбора подходящей функции
          const isHeightmapTerrain = currentLayer?.terrain?.source.kind === 'heightmap'
          
          let result
          if (isHeightmapTerrain) {
            // Для heightmap используем асинхронную версию
            result = await SceneAPI.adjustInstancesForTerrainAsync(layerId)
          } else {
            // Для Perlin Noise и legacy используем синхронную версию
            result = SceneAPI.adjustInstancesForPerlinTerrain(layerId)
          }
          
          if (result.success && result.adjustedCount && result.adjustedCount > 0) {
            const terrainType = isHeightmapTerrain ? 'heightmap' : 'Perlin Noise'
            
            if (DEBUG) console.log('🗻 Successfully adjusted', result.adjustedCount, 'instances for', terrainType)
            
            if (showSuccessNotification) {
              notifications.show({
                title: 'Объекты скорректированы',
                message: `Позиции ${result.adjustedCount} объектов скорректированы под рельеф ${terrainType}`,
                color: 'green'
              })
            }
            
            return {
              success: true,
              adjustedCount: result.adjustedCount,
              terrainType
            }
          } else if (result.success) {
            if (DEBUG) console.log('🗻 Adjustment completed but no instances were adjusted')
            return {
              success: true,
              adjustedCount: 0,
              terrainType: isHeightmapTerrain ? 'heightmap' : 'Perlin Noise'
            }
          } else {
            if (DEBUG) console.log('🗻 Adjustment failed:', result.error)
            throw new Error(result.error || 'Adjustment failed')
          }
        } catch (error) {
          console.error('Error during terrain adjustment:', error)
          
          if (attempt < maxAttempts) {
            if (DEBUG) console.log(`🗻 Retrying adjustment in ${retryDelay * attempt}ms...`)
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
            return attemptAdjustment(attempt + 1)
          } else {
            console.warn('Failed to adjust objects: max attempts reached')
            
            if (showErrorNotification) {
              notifications.show({
                title: 'Ошибка корректировки',
                message: 'Не удалось скорректировать позиции объектов под рельеф',
                color: 'red'
              })
            }
            
            return {
              success: false,
              error: 'Max attempts reached'
            }
          }
        }
      } else if (attempt < maxAttempts) {
        if (DEBUG) console.log(`🗻 Terrain data not ready, retrying in ${retryDelay * attempt}ms...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
        return attemptAdjustment(attempt + 1)
      } else {
        console.warn('Failed to adjust objects: terrain data not available after', maxAttempts, 'attempts')
        return {
          success: false,
          error: 'Terrain data not available'
        }
      }
    } catch (error) {
      console.error('Error in terrain adjustment attempt:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  return attemptAdjustment()
}

/**
 * Запускает выравнивание объектов с задержкой (для использования после создания слоя)
 * @param options - параметры выравнивания
 * @param delay - задержка перед началом выравнивания в мс (по умолчанию 100)
 */
export function scheduleTerrainAdjustment(
  options: TerrainAdjustmentOptions,
  delay: number = 100
): void {
  setTimeout(() => {
    adjustObjectsForCreatedTerrain(options).catch(error => {
      console.error('Error in scheduled terrain adjustment:', error)
    })
  }, delay)
}