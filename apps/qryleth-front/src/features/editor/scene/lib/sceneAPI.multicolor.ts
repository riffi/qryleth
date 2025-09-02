/**
 * Дополнительные утилиты для SceneAPI для работы с многоцветными слоями
 */

import type { GfxMultiColorConfig } from '@/entities/layer'
import { 
  mountainHeightZones,
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
   * Автоматически вычисляет палитру на основе диапазона высот террейна.
   * 
   * @param minHeight - минимальная высота террейна
   * @param maxHeight - максимальная высота террейна  
   * @param zoneCount - количество цветовых стопов (3-7)
   * @returns конфигурация многоцветной окраски
   */
  static createHeightBasedConfig(
    minHeight: number,
    maxHeight: number,
    zoneCount: number = 5
  ): GfxMultiColorConfig {
    return createAutoHeightZones(minHeight, maxHeight, zoneCount)
  }

  /**
   * Создать конфигурацию двухцветного градиента по высоте.
   * Полезно для простых переходов типа вода-суша или равнина-горы.
   *
   * @param lowColor - цвет для низких высот
   * @param highColor - цвет для высоких высот
   * @param threshold - пороговое значение высоты для центра градиента
   * @returns конфигурация двухцветного градиента
   */
  static createTwoColorGradient(
    lowColor: string,
    highColor: string,
    threshold: number
  ): GfxMultiColorConfig {
    return createSimpleGradient(lowColor, highColor, threshold)
  }

  /**
   * Получить готовую конфигурацию горного ландшафта с высотной палитрой.
   * Включает переходы от воды до заснеженных вершин.
   * 
   * @returns конфигурация горного ландшафта
   */
  static getMountainHeightConfig(): GfxMultiColorConfig {
    return mountainHeightZones
  }

  /**
   * Получить готовую конфигурацию пустынного ландшафта с высотной палитрой.
   * Включает переходы от оазисов до скалистых утесов.
   * 
   * @returns конфигурация пустынного ландшафта
   */
  static getDesertHeightConfig(): GfxMultiColorConfig {
    return desertHeightZones
  }


  /**
   * Создать конфигурацию тропического ландшафта.
   * Включает океан, пляжи, джунгли и горные вершины.
   * 
   * @param minHeight - минимальная высота (уровень моря)
   * @param maxHeight - максимальная высота (горные вершины)
   * @returns конфигурация тропического ландшафта
   */
  static createTropicalConfig(
    minHeight: number = -5,
    maxHeight: number = 30
  ): GfxMultiColorConfig {
    const range = maxHeight - minHeight

    return {
      palette: [
        { height: minHeight, color: '#0d1b4d' }, // Глубокий океан
        { height: minHeight + range * 0.1, color: '#1e5f99' }, // Мелководье
        { height: minHeight + range * 0.2, color: '#f5deb3' }, // Пляж
        { height: minHeight + range * 0.3, color: '#228b22' }, // Прибрежный лес
        { height: minHeight + range * 0.55, color: '#006400' }, // Джунгли
        { height: minHeight + range * 0.8, color: '#8b7355' }, // Горные склоны
        { height: minHeight + range * 0.95, color: '#d3d3d3' } // Горные вершины
      ]
    }
  }

  /**
   * Создать конфигурацию арктического ландшафта.
   * Включает ледяную воду, тундру и ледники.
   * 
   * @param minHeight - минимальная высота (ледяная вода)
   * @param maxHeight - максимальная высота (ледники)
   * @returns конфигурация арктического ландшафта
   */
  static createArcticConfig(
    minHeight: number = -3,
    maxHeight: number = 25
  ): GfxMultiColorConfig {
    const range = maxHeight - minHeight

    return {
      palette: [
        { height: minHeight, color: '#4682b4' }, // Ледяная вода
        { height: minHeight + range * 0.15, color: '#b0e0e6' }, // Ледяной шельф
        { height: minHeight + range * 0.25, color: '#8fbc8f' }, // Тундра
        { height: minHeight + range * 0.45, color: '#696969' }, // Каменистая почва
        { height: minHeight + range * 0.75, color: '#fffafa' }, // Снежные поля
        { height: minHeight + range * 0.9, color: '#f0f8ff' } // Ледники
      ]
    }
  }

  /**
   * Создать пользовательскую конфигурацию из массива цветов по высоте.
   * Автоматически распределяет цвета по заданному диапазону высот.
   *
   * @param colors - массив цветов (минимум 2)
   * @param minHeight - минимальная высота
   * @param maxHeight - максимальная высота
   * @returns пользовательская конфигурация
   */
  static createCustomConfig(
    colors: string[],
    minHeight: number,
    maxHeight: number
  ): GfxMultiColorConfig {
    if (colors.length < 2) {
      throw new Error('Необходимо минимум 2 цвета для создания конфигурации')
    }

    const range = maxHeight - minHeight
    const stepSize = range / (colors.length - 1)
    
    const palette = colors.map((color, index) => ({
      height: minHeight + index * stepSize,
      color
    }))

    return {
      palette
    }
  }
}

// Экспорт для использования в ScriptingPanel
export const multiColorApi = MultiColorAPI