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
  palette: [
    { height: -10, color: '#1a4480' }, // Глубокая вода
    { height: -1, color: '#2e5c8a' }, // Мелководье
    { height: 1, color: '#d4b896' }, // Пляж
    { height: 3, color: '#4a7c59' }, // Луга
    { height: 8.5, color: '#2d5a3d' }, // Лес
    { height: 15.5, color: '#6b6b6b' }, // Каменистые склоны
    { height: 25.5, color: '#f0f8ff' } // Снежные вершины
  ]
};


/**
 * Пример пустынного ландшафта с зональностью по высоте.
 * Имитирует переход от оазисов к песчаным дюнам и скалистым массивам.
 */
export const desertHeightZones: GfxMultiColorConfig = {
  palette: [
    { height: -1, color: '#2e8b57' }, // Оазис
    { height: 1.5, color: '#deb887' }, // Низкие пески
    { height: 5.5, color: '#f4a460' }, // Песчаные дюны
    { height: 12.5, color: '#8b7355' }, // Скалистые выходы
    { height: 20.5, color: '#696969' } // Высокие утесы
  ]
};

/**
 * Функция для создания простой двухцветной конфигурации.
 * Полезна для быстрого создания контрастных переходов.
 * 
 * @param color1 - первый цвет (для низких значений)
 * @param color2 - второй цвет (для высоких значений)
 * @param threshold - пороговое значение для перехода
 * @returns конфигурация двухцветного градиента
 */
export function createSimpleGradient(
  color1: string,
  color2: string,
  threshold: number
): GfxMultiColorConfig {
  return {
    palette: [
      { height: threshold - 5, color: color1 },
      { height: threshold + 5, color: color2 }
    ]
  };
}

/**
 * Функция для создания конфигурации на основе существующего диапазона высот.
 * Автоматически вычисляет палитру на основе минимальной и максимальной высоты.
 * 
 * @param minHeight - минимальная высота террейна
 * @param maxHeight - максимальная высота террейна
 * @param zoneCount - количество цветовых стопов (3-7)
 * @returns автоматически созданная конфигурация
 */
export function createAutoHeightZones(
  minHeight: number,
  maxHeight: number,
  zoneCount: number = 5
): GfxMultiColorConfig {
  const range = maxHeight - minHeight;
  const stepSize = range / (zoneCount - 1);

  // Предустановленные цвета для разного количества стопов
  const colorSchemes = {
    3: ['#2e5c8a', '#4a7c59', '#f0f8ff'],
    4: ['#2e5c8a', '#d4b896', '#4a7c59', '#6b6b6b'],
    5: ['#2e5c8a', '#d4b896', '#4a7c59', '#6b6b6b', '#f0f8ff'],
    6: ['#1a4480', '#2e5c8a', '#d4b896', '#4a7c59', '#6b6b6b', '#f0f8ff'],
    7: ['#1a4480', '#2e5c8a', '#d4b896', '#4a7c59', '#2d5a3d', '#6b6b6b', '#f0f8ff']
  };

  const colors = colorSchemes[Math.min(7, Math.max(3, zoneCount)) as keyof typeof colorSchemes];

  const palette = [];
  for (let i = 0; i < zoneCount; i++) {
    const height = minHeight + i * stepSize;
    palette.push({
      height,
      color: colors[i]
    });
  }

  return {
    palette
  };
}