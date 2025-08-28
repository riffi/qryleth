import type { GfxMultiColorConfig } from '@/entities/layer';
import { MultiColorProcessor } from '../MultiColorProcessor';

/**
 * Примеры конфигураций для многоцветной окраски террейна.
 * Эти примеры можно использовать как основу для создания собственных конфигураций.
 */

/**
 * Пример конфигурации высотной зональности для горного ландшафта.
 * Создает реалистичный переход от воды через луга к заснеженным вершинам.
 */
export const mountainHeightZones: GfxMultiColorConfig = {
  parameter: 'height',
  blendWidth: 1.5,
  zones: [
    {
      id: 'deep_water',
      name: 'Глубокая вода',
      color: '#1a4480',
      min: -10,
      max: -2
    },
    {
      id: 'shallow_water',
      name: 'Мелководье',
      color: '#2e5c8a',
      min: -1,
      max: 0.5
    },
    {
      id: 'beach',
      name: 'Пляж',
      color: '#d4b896',
      min: 1,
      max: 2.5
    },
    {
      id: 'grassland',
      name: 'Луга',
      color: '#4a7c59',
      min: 3,
      max: 8
    },
    {
      id: 'forest',
      name: 'Лес',
      color: '#2d5a3d',
      min: 8.5,
      max: 15
    },
    {
      id: 'rocky_slopes',
      name: 'Каменистые склоны',
      color: '#6b6b6b',
      min: 15.5,
      max: 25
    },
    {
      id: 'snow_peaks',
      name: 'Снежные вершины',
      color: '#f0f8ff',
      min: 25.5,
      max: 40
    }
  ]
};

/**
 * Пример конфигурации зональности по наклону для выделения склонов.
 * Полезно для визуализации опасных или труднопроходимых участков.
 */
export const slopeBasedZones: GfxMultiColorConfig = {
  parameter: 'slope',
  blendWidth: 0.05,
  zones: [
    {
      id: 'flat_plains',
      name: 'Равнины',
      color: '#4a7c59',
      min: 0,
      max: 0.1
    },
    {
      id: 'gentle_hills',
      name: 'Холмы',
      color: '#5a8a4a',
      min: 0.15,
      max: 0.3
    },
    {
      id: 'moderate_slopes',
      name: 'Умеренные склоны',
      color: '#7a7a4a',
      min: 0.35,
      max: 0.5
    },
    {
      id: 'steep_slopes',
      name: 'Крутые склоны',
      color: '#8b7355',
      min: 0.55,
      max: 0.7
    },
    {
      id: 'dangerous_cliffs',
      name: 'Опасные утесы',
      color: '#aa4444',
      min: 0.75,
      max: 1.0
    }
  ]
};

/**
 * Пример конфигурации зональности по кривизне для выделения особенностей рельефа.
 * Помогает визуализировать впадины, возвышенности и перегибы рельефа.
 */
export const curvatureBasedZones: GfxMultiColorConfig = {
  parameter: 'curvature',
  blendWidth: 0.02,
  zones: [
    {
      id: 'concave_valleys',
      name: 'Впадины и долины',
      color: '#2e5c8a',
      min: 0,
      max: 0.15
    },
    {
      id: 'flat_areas',
      name: 'Плоские участки',
      color: '#4a7c59',
      min: 0.2,
      max: 0.4
    },
    {
      id: 'moderate_curves',
      name: 'Умеренная кривизна',
      color: '#7a7a4a',
      min: 0.45,
      max: 0.6
    },
    {
      id: 'sharp_ridges',
      name: 'Острые хребты',
      color: '#8b7355',
      min: 0.65,
      max: 0.8
    },
    {
      id: 'extreme_features',
      name: 'Экстремальные формы',
      color: '#aa4444',
      min: 0.85,
      max: 1.0
    }
  ]
};

/**
 * Пример пустынного ландшафта с зональностью по высоте.
 * Имитирует переход от оазисов к песчаным дюнам и скалистым массивам.
 */
export const desertHeightZones: GfxMultiColorConfig = {
  parameter: 'height',
  blendWidth: 2.0,
  zones: [
    {
      id: 'oasis',
      name: 'Оазис',
      color: '#2e8b57',
      min: -1,
      max: 1
    },
    {
      id: 'low_sand',
      name: 'Низкие пески',
      color: '#deb887',
      min: 1.5,
      max: 5
    },
    {
      id: 'sand_dunes',
      name: 'Песчаные дюны',
      color: '#f4a460',
      min: 5.5,
      max: 12
    },
    {
      id: 'rocky_outcrops',
      name: 'Скалистые выходы',
      color: '#8b7355',
      min: 12.5,
      max: 20
    },
    {
      id: 'high_cliffs',
      name: 'Высокие утесы',
      color: '#696969',
      min: 20.5,
      max: 35
    }
  ]
};

/**
 * Функция для создания простой двухцветной конфигурации.
 * Полезна для быстрого создания контрастных переходов.
 * 
 * @param parameter - параметр для градиента
 * @param color1 - первый цвет (для низких значений)
 * @param color2 - второй цвет (для высоких значений)
 * @param threshold - пороговое значение для перехода
 * @param blendWidth - ширина зоны перехода
 * @returns конфигурация двухцветного градиента
 */
export function createSimpleGradient(
  parameter: 'height' | 'slope' | 'curvature',
  color1: string,
  color2: string,
  threshold: number,
  blendWidth: number = 1.0
): GfxMultiColorConfig {
  return {
    parameter,
    blendWidth,
    zones: [
      {
        id: 'low',
        name: 'Низкие значения',
        color: color1,
        min: threshold - blendWidth * 2,
        max: threshold - blendWidth / 2
      },
      {
        id: 'high',
        name: 'Высокие значения',
        color: color2,
        min: threshold + blendWidth / 2,
        max: threshold + blendWidth * 2
      }
    ]
  };
}

/**
 * Функция для создания конфигурации на основе существующего диапазона высот.
 * Автоматически вычисляет зоны на основе минимальной и максимальной высоты.
 * 
 * @param minHeight - минимальная высота террейна
 * @param maxHeight - максимальная высота террейна
 * @param zoneCount - количество цветовых зон (3-7)
 * @returns автоматически созданная конфигурация
 */
export function createAutoHeightZones(
  minHeight: number,
  maxHeight: number,
  zoneCount: number = 5
): GfxMultiColorConfig {
  const range = maxHeight - minHeight;
  const zoneSize = range / zoneCount;
  const blendWidth = zoneSize * 0.1;

  // Предустановленные цвета для разного количества зон
  const colorSchemes = {
    3: ['#2e5c8a', '#4a7c59', '#f0f8ff'],
    4: ['#2e5c8a', '#d4b896', '#4a7c59', '#6b6b6b'],
    5: ['#2e5c8a', '#d4b896', '#4a7c59', '#6b6b6b', '#f0f8ff'],
    6: ['#1a4480', '#2e5c8a', '#d4b896', '#4a7c59', '#6b6b6b', '#f0f8ff'],
    7: ['#1a4480', '#2e5c8a', '#d4b896', '#4a7c59', '#2d5a3d', '#6b6b6b', '#f0f8ff']
  };

  const colors = colorSchemes[Math.min(7, Math.max(3, zoneCount)) as keyof typeof colorSchemes];
  const zoneNames = ['Вода', 'Пляж', 'Луга', 'Лес', 'Холмы', 'Камни', 'Снег'];

  const zones = [];
  for (let i = 0; i < zoneCount; i++) {
    const zoneMin = minHeight + i * zoneSize;
    const zoneMax = minHeight + (i + 1) * zoneSize;
    
    zones.push({
      id: `zone_${i}`,
      name: zoneNames[i] || `Зона ${i + 1}`,
      color: colors[i],
      min: i === 0 ? zoneMin : zoneMin + blendWidth,
      max: i === zoneCount - 1 ? zoneMax : zoneMax - blendWidth
    });
  }

  return {
    parameter: 'height',
    blendWidth,
    zones
  };
}