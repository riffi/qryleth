/**
 * Дополнительные утилиты для SceneAPI для работы с многоцветными слоями
 */

import type { GfxMultiColorConfig } from '@/entities/layer'
import { 
  mountainHeightZones,
  slopeBasedZones, 
  curvatureBasedZones,
  desertHeightZones,
  createSimpleGradient,
  createAutoHeightZones
} from './terrain/examples/multiColorExamples'

/**
 * Расширенные утилиты для SceneAPI с поддержкой многоцветных конфигураций
 */
export class MultiColorAPI {
  /**
   * Создать конфигурацию многоцветной окраски по высоте.
   * Автоматически вычисляет зоны на основе диапазона высот террейна.
   * 
   * @param minHeight - минимальная высота террейна
   * @param maxHeight - максимальная высота террейна  
   * @param zoneCount - количество цветовых зон (3-7)
   * @param blendWidth - ширина зоны градиентного перехода
   * @returns конфигурация многоцветной окраски
   */
  static createHeightBasedConfig(
    minHeight: number,
    maxHeight: number,
    zoneCount: number = 5,
    blendWidth: number = 1.0
  ): GfxMultiColorConfig {
    const config = createAutoHeightZones(minHeight, maxHeight, zoneCount)
    return { ...config, blendWidth }
  }

  /**
   * Создать конфигурацию двухцветного градиента.
   * Полезно для простых переходов типа вода-суша или равнина-горы.
   * 
   * @param parameter - параметр для градиента ('height', 'slope', 'curvature')
   * @param lowColor - цвет для низких значений параметра
   * @param highColor - цвет для высоких значений параметра
   * @param threshold - пороговое значение для центра градиента
   * @param blendWidth - ширина зоны перехода
   * @returns конфигурация двухцветного градиента
   */
  static createTwoColorGradient(
    parameter: 'height' | 'slope' | 'curvature',
    lowColor: string,
    highColor: string,
    threshold: number,
    blendWidth: number = 1.0
  ): GfxMultiColorConfig {
    return createSimpleGradient(parameter, lowColor, highColor, threshold, blendWidth)
  }

  /**
   * Получить готовую конфигурацию горного ландшафта с высотной зональностью.
   * Включает переходы от воды до заснеженных вершин.
   * 
   * @param blendWidth - ширина зоны градиентного перехода (по умолчанию 1.5)
   * @returns конфигурация горного ландшафта
   */
  static getMountainHeightConfig(blendWidth: number = 1.5): GfxMultiColorConfig {
    return { ...mountainHeightZones, blendWidth }
  }

  /**
   * Получить готовую конфигурацию пустынного ландшафта с высотной зональностью.
   * Включает переходы от оазисов до скалистых утесов.
   * 
   * @param blendWidth - ширина зоны градиентного перехода (по умолчанию 2.0)
   * @returns конфигурация пустынного ландшафта
   */
  static getDesertHeightConfig(blendWidth: number = 2.0): GfxMultiColorConfig {
    return { ...desertHeightZones, blendWidth }
  }

  /**
   * Получить готовую конфигурацию окраски по наклону поверхности.
   * Выделяет равнины, склоны и утесы разными цветами.
   * 
   * @param blendWidth - ширина зоны градиентного перехода (по умолчанию 0.1)
   * @returns конфигурация окраски по наклону
   */
  static getSlopeBasedConfig(blendWidth: number = 0.1): GfxMultiColorConfig {
    return { ...slopeBasedZones, blendWidth }
  }

  /**
   * Получить готовую конфигурацию окраски по кривизне поверхности.
   * Выделяет впадины, плоские участки и острые формы рельефа.
   * 
   * @param blendWidth - ширина зоны градиентного перехода (по умолчанию 0.02)
   * @returns конфигурация окраски по кривизне
   */
  static getCurvatureBasedConfig(blendWidth: number = 0.02): GfxMultiColorConfig {
    return { ...curvatureBasedZones, blendWidth }
  }

  /**
   * Создать конфигурацию тропического ландшафта.
   * Включает океан, пляжи, джунгли и горные вершины.
   * 
   * @param minHeight - минимальная высота (уровень моря)
   * @param maxHeight - максимальная высота (горные вершины)
   * @param blendWidth - ширина зоны градиентного перехода
   * @returns конфигурация тропического ландшафта
   */
  static createTropicalConfig(
    minHeight: number = -5,
    maxHeight: number = 30,
    blendWidth: number = 1.2
  ): GfxMultiColorConfig {
    const range = maxHeight - minHeight

    return {
      parameter: 'height',
      blendWidth,
      zones: [
        {
          id: 'deep_ocean',
          name: 'Глубокий океан',
          color: '#0d1b4d',
          min: minHeight,
          max: minHeight + range * 0.05
        },
        {
          id: 'shallow_ocean',
          name: 'Мелководье',
          color: '#1e5f99',
          min: minHeight + range * 0.1,
          max: minHeight + range * 0.15
        },
        {
          id: 'beach',
          name: 'Пляж',
          color: '#f5deb3',
          min: minHeight + range * 0.2,
          max: minHeight + range * 0.25
        },
        {
          id: 'coastal_forest',
          name: 'Прибрежный лес',
          color: '#228b22',
          min: minHeight + range * 0.3,
          max: minHeight + range * 0.5
        },
        {
          id: 'jungle',
          name: 'Джунгли',
          color: '#006400',
          min: minHeight + range * 0.55,
          max: minHeight + range * 0.75
        },
        {
          id: 'mountain_slopes',
          name: 'Горные склоны',
          color: '#8b7355',
          min: minHeight + range * 0.8,
          max: minHeight + range * 0.9
        },
        {
          id: 'peaks',
          name: 'Горные вершины',
          color: '#d3d3d3',
          min: minHeight + range * 0.95,
          max: maxHeight
        }
      ]
    }
  }

  /**
   * Создать конфигурацию арктического ландшафта.
   * Включает ледяную воду, тундру и ледники.
   * 
   * @param minHeight - минимальная высота (ледяная вода)
   * @param maxHeight - максимальная высота (ледники)
   * @param blendWidth - ширина зоны градиентного перехода
   * @returns конфигурация арктического ландшафта
   */
  static createArcticConfig(
    minHeight: number = -3,
    maxHeight: number = 25,
    blendWidth: number = 0.8
  ): GfxMultiColorConfig {
    const range = maxHeight - minHeight

    return {
      parameter: 'height',
      blendWidth,
      zones: [
        {
          id: 'ice_water',
          name: 'Ледяная вода',
          color: '#4682b4',
          min: minHeight,
          max: minHeight + range * 0.1
        },
        {
          id: 'ice_shelf',
          name: 'Ледяной шельф',
          color: '#b0e0e6',
          min: minHeight + range * 0.15,
          max: minHeight + range * 0.2
        },
        {
          id: 'tundra',
          name: 'Тундра',
          color: '#8fbc8f',
          min: minHeight + range * 0.25,
          max: minHeight + range * 0.4
        },
        {
          id: 'rocky_ground',
          name: 'Каменистая почва',
          color: '#696969',
          min: minHeight + range * 0.45,
          max: minHeight + range * 0.7
        },
        {
          id: 'snow_fields',
          name: 'Снежные поля',
          color: '#fffafa',
          min: minHeight + range * 0.75,
          max: minHeight + range * 0.85
        },
        {
          id: 'glaciers',
          name: 'Ледники',
          color: '#f0f8ff',
          min: minHeight + range * 0.9,
          max: maxHeight
        }
      ]
    }
  }

  /**
   * Создать пользовательскую конфигурацию из массива цветов.
   * Автоматически распределяет цвета по заданному диапазону значений.
   * 
   * @param parameter - параметр для градиента
   * @param colors - массив цветов (минимум 2)
   * @param minValue - минимальное значение параметра
   * @param maxValue - максимальное значение параметра
   * @param blendWidth - ширина зоны градиентного перехода
   * @param zoneNames - названия зон (опционально)
   * @returns пользовательская конфигурация
   */
  static createCustomConfig(
    parameter: 'height' | 'slope' | 'curvature',
    colors: string[],
    minValue: number,
    maxValue: number,
    blendWidth: number = 1.0,
    zoneNames?: string[]
  ): GfxMultiColorConfig {
    if (colors.length < 2) {
      throw new Error('Необходимо минимум 2 цвета для создания конфигурации')
    }

    const range = maxValue - minValue
    const zoneSize = range / colors.length
    const zones = colors.map((color, index) => {
      const zoneMin = minValue + index * zoneSize
      const zoneMax = minValue + (index + 1) * zoneSize

      return {
        id: `zone_${index}`,
        name: zoneNames?.[index] || `Зона ${index + 1}`,
        color,
        min: index === 0 ? zoneMin : zoneMin + blendWidth / 2,
        max: index === colors.length - 1 ? zoneMax : zoneMax - blendWidth / 2
      }
    })

    return {
      parameter,
      blendWidth,
      zones
    }
  }
}

// Экспорт для использования в ScriptingPanel
export const multiColorApi = MultiColorAPI