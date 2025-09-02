import type { GfxHeightSampler } from '@/entities/terrain';
import * as THREE from 'three';

/**
 * Утилиты для вычисления параметров поверхности террейна,
 * используемых в системе многоцветной окраски слоев.
 */

/**
 * Вычисляет наклон поверхности в указанной точке.
 * Наклон определяется как угол между нормалью и вертикалью.
 * 
 * @param sampler - сэмплер высот террейна
 * @param x - координата X в мировой системе координат
 * @param z - координата Z в мировой системе координат
 * @returns наклон в диапазоне [0, 1], где 0 - горизонтальная поверхность, 1 - вертикальная
 */
export function calculateSlope(sampler: GfxHeightSampler, x: number, z: number): number {
  const normal = sampler.getNormal(x, z);
  // Наклон = 1 - cos(угла между нормалью и вертикалью)
  // Нормаль направлена вверх, поэтому normal[1] это Y-компонента
  const slope = 1 - Math.abs(normal[1]);
  return Math.max(0, Math.min(1, slope));
}

/**
 * Вычисляет кривизну поверхности в указанной точке.
 * Кривизна определяется как изменение наклона в окрестности точки.
 * 
 * @param sampler - сэмплер высот террейна
 * @param x - координата X в мировой системе координат
 * @param z - координата Z в мировой системе координат
 * @param step - шаг для численного дифференцирования (по умолчанию 0.1)
 * @returns кривизна в диапазоне [0, 1], где 0 - плоская поверхность, 1 - максимальная кривизна
 */
export function calculateCurvature(sampler: GfxHeightSampler, x: number, z: number, step: number = 0.1): number {
  // Вычисляем высоты в 5 точках для оценки кривизны
  const h_center = sampler.getHeight(x, z);
  const h_left = sampler.getHeight(x - step, z);
  const h_right = sampler.getHeight(x + step, z);
  const h_front = sampler.getHeight(x, z - step);
  const h_back = sampler.getHeight(x, z + step);

  // Вторые производные по X и Z
  const d2_dx2 = (h_left - 2 * h_center + h_right) / (step * step);
  const d2_dz2 = (h_front - 2 * h_center + h_back) / (step * step);

  // Смешанная производная
  const h_left_front = sampler.getHeight(x - step, z - step);
  const h_left_back = sampler.getHeight(x - step, z + step);
  const h_right_front = sampler.getHeight(x + step, z - step);
  const h_right_back = sampler.getHeight(x + step, z + step);
  const d2_dxdz = (h_right_back - h_right_front - h_left_back + h_left_front) / (4 * step * step);

  // Гауссова кривизна
  const gaussianCurvature = d2_dx2 * d2_dz2 - d2_dxdz * d2_dxdz;
  
  // Средняя кривизна
  const meanCurvature = (d2_dx2 + d2_dz2) / 2;

  // Используем абсолютную величину средней кривизны, нормализованную
  const curvature = Math.abs(meanCurvature);
  
  // Нормализуем в диапазон [0, 1] (эмпирический коэффициент)
  return Math.max(0, Math.min(1, curvature * 10));
}

/**
 * Получает значение параметра поверхности для многоцветной окраски.
 * 
 * @param parameter - тип параметра ('height', 'slope', 'curvature')
 * @param sampler - сэмплер высот террейна
 * @param x - координата X в мировой системе координат
 * @param z - координата Z в мировой системе координат
 * @returns значение параметра
 */
export function getSurfaceParameter(
  parameter: 'height' | 'slope' | 'curvature',
  sampler: GfxHeightSampler,
  x: number,
  z: number
): number {
  switch (parameter) {
    case 'height':
      return sampler.getHeight(x, z);
    case 'slope':
      return calculateSlope(sampler, x, z);
    case 'curvature':
      return calculateCurvature(sampler, x, z);
    default:
      return 0;
  }
}

/**
 * Интерполирует цвет между двумя THREE.Color объектами.
 * 
 * @param color1 - первый цвет
 * @param color2 - второй цвет
 * @param t - коэффициент интерполяции [0, 1]
 * @returns интерполированный цвет
 */
export function interpolateColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  const result = new THREE.Color();
  result.r = color1.r + (color2.r - color1.r) * t;
  result.g = color1.g + (color2.g - color1.g) * t;
  result.b = color1.b + (color2.b - color1.b) * t;
  return result;
}

/**
 * Находит две соседние зоны для заданного значения параметра.
 * 
 * @param value - значение параметра
 * @param zones - отсортированные по возрастанию зоны
 * @returns индексы двух соседних зон и коэффициент интерполяции между ними
 */
export function findZoneIndices(
  value: number,
  zones: Array<{ min: number; max: number; color: string }>
): { lowerIndex: number; upperIndex: number; t: number } {
  // Если значение меньше минимального
  if (value <= zones[0].min) {
    return { lowerIndex: 0, upperIndex: 0, t: 0 };
  }

  // Если значение больше максимального
  const lastIndex = zones.length - 1;
  if (value >= zones[lastIndex].max) {
    return { lowerIndex: lastIndex, upperIndex: lastIndex, t: 0 };
  }

  // Находим зону, в которую попадает значение
  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];
    
    // Значение внутри зоны
    if (value >= zone.min && value <= zone.max) {
      return { lowerIndex: i, upperIndex: i, t: 0 };
    }
    
    // Значение между текущей и следующей зоной
    if (i < zones.length - 1) {
      const nextZone = zones[i + 1];
      if (value > zone.max && value < nextZone.min) {
        // Интерполяция между концом текущей зоны и началом следующей
        const totalDistance = nextZone.min - zone.max;
        const currentDistance = value - zone.max;
        const t = totalDistance > 0 ? currentDistance / totalDistance : 0;
        return { lowerIndex: i, upperIndex: i + 1, t };
      }
    }
  }

  // Резервный случай
  return { lowerIndex: 0, upperIndex: 0, t: 0 };
}