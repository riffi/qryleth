import type { GfxMultiColorConfig, GfxColorZone } from '@/entities/layer';
import type { GfxHeightSampler } from '@/entities/terrain';
import * as THREE from 'three';
import { getSurfaceParameter, interpolateColor, findZoneIndices } from './colorUtils';

/**
 * Процессор для многоцветной окраски террейна на основе параметров поверхности.
 * Реализует зональную систему цветов с плавными градиентными переходами.
 */
export class MultiColorProcessor {
  private config: GfxMultiColorConfig;
  private zoneColors: THREE.Color[];

  /**
   * Создать процессор многоцветной окраски.
   * 
   * @param config - конфигурация многоцветной окраски
   */
  constructor(config: GfxMultiColorConfig) {
    this.config = config;
    this.zoneColors = config.zones.map(zone => new THREE.Color(zone.color));
    this.validateAndSortZones();
  }

  /**
   * Валидация и сортировка зон по возрастанию значения параметра.
   */
  private validateAndSortZones(): void {
    if (this.config.zones.length === 0) {
      throw new Error('MultiColorProcessor: необходимо задать хотя бы одну цветовую зону');
    }

    // Сортируем зоны по минимальному значению параметра
    this.config.zones.sort((a, b) => a.min - b.min);

    // Проверяем корректность диапазонов
    for (let i = 0; i < this.config.zones.length; i++) {
      const zone = this.config.zones[i];
      if (zone.min >= zone.max) {
        throw new Error(`MultiColorProcessor: некорректный диапазон в зоне "${zone.name}": min (${zone.min}) >= max (${zone.max})`);
      }
    }
  }

  /**
   * Получить диапазон значений параметра для всех зон.
   * 
   * @returns кортеж [минимальное_значение, максимальное_значение]
   */
  private getParameterRange(): [number, number] {
    if (this.config.range) {
      return this.config.range;
    }

    const minValue = Math.min(...this.config.zones.map(zone => zone.min));
    const maxValue = Math.max(...this.config.zones.map(zone => zone.max));
    return [minValue, maxValue];
  }

  /**
   * Вычисляет цвет для заданной точки поверхности.
   * 
   * @param sampler - сэмплер высот террейна
   * @param x - координата X в мировой системе координат
   * @param z - координата Z в мировой системе координат
   * @returns цвет в формате THREE.Color
   */
  getColorAtPoint(sampler: GfxHeightSampler, x: number, z: number): THREE.Color {
    // Получаем значение параметра поверхности
    const parameterValue = getSurfaceParameter(this.config.parameter, sampler, x, z);
    
    // Находим соседние зоны и коэффициент интерполяции
    const { lowerIndex, upperIndex, t } = findZoneIndices(parameterValue, this.config.zones);
    
    // Если точка находится внутри одной зоны
    if (lowerIndex === upperIndex) {
      return this.zoneColors[lowerIndex].clone();
    }

    // Применяем плавный переход с учетом blendWidth
    const blendT = this.calculateBlendFactor(parameterValue, lowerIndex, upperIndex, t);
    
    return interpolateColor(
      this.zoneColors[lowerIndex],
      this.zoneColors[upperIndex],
      blendT
    );
  }

  /**
   * Вычисляет коэффициент смешивания цветов с учетом зоны перехода.
   * 
   * @param value - значение параметра
   * @param lowerIndex - индекс нижней зоны
   * @param upperIndex - индекс верхней зоны
   * @param baseT - базовый коэффициент интерполяции
   * @returns скорректированный коэффициент смешивания [0, 1]
   */
  private calculateBlendFactor(
    value: number,
    lowerIndex: number,
    upperIndex: number,
    baseT: number
  ): number {
    if (!this.config.blendWidth || this.config.blendWidth <= 0) {
      return baseT;
    }

    const lowerZone = this.config.zones[lowerIndex];
    const upperZone = this.config.zones[upperIndex];
    
    const lowerEdge = lowerZone.max;
    const upperEdge = upperZone.min;
    const gapSize = upperEdge - lowerEdge;
    
    // Если зазора нет или он меньше зоны перехода
    if (gapSize <= this.config.blendWidth) {
      return baseT;
    }

    // Вычисляем зоны плавного перехода
    const halfBlend = this.config.blendWidth / 2;
    const blendStart = lowerEdge;
    const blendEnd = upperEdge;
    
    // Если значение в начале зоны перехода (ближе к нижней зоне)
    if (value < blendStart + halfBlend) {
      const distFromStart = value - blendStart;
      const t = Math.max(0, distFromStart / halfBlend);
      return t * 0.5; // Плавный переход от 0 к 0.5
    }
    
    // Если значение в конце зоны перехода (ближе к верхней зоне)
    if (value > blendEnd - halfBlend) {
      const distToEnd = blendEnd - value;
      const t = Math.max(0, distToEnd / halfBlend);
      return 0.5 + (1 - t) * 0.5; // Плавный переход от 0.5 к 1
    }
    
    // В середине зоны перехода
    return 0.5;
  }

  /**
   * Генерирует массив цветов для всех вершин геометрии террейна.
   * 
   * @param sampler - сэмплер высот террейна
   * @param geometry - геометрия террейна (THREE.PlaneGeometry или BufferGeometry)
   * @returns Float32Array с цветами вершин в формате RGB
   */
  generateVertexColors(sampler: GfxHeightSampler, geometry: THREE.BufferGeometry): Float32Array {
    const positionAttribute = geometry.attributes.position;
    const vertexCount = positionAttribute.count;
    const colors = new Float32Array(vertexCount * 3); // RGB для каждой вершины

    // Обрабатываем каждую вершину
    for (let i = 0; i < vertexCount; i++) {
      // Получаем координаты вершины
      const x = positionAttribute.getX(i);
      const z = positionAttribute.getZ(i);

      // Вычисляем цвет для этой точки
      const color = this.getColorAtPoint(sampler, x, z);

      // Записываем цвет в массив
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return colors;
  }

  /**
   * Создает предустановленную конфигурацию для высотной зональности.
   * Подходит для создания реалистичного ландшафта: вода → песок → трава → камни → снег.
   * 
   * @param minHeight - минимальная высота террейна
   * @param maxHeight - максимальная высота террейна
   * @param blendWidth - размер зоны перехода между цветами
   * @returns конфигурация высотной зональности
   */
  static createHeightBasedPreset(
    minHeight: number,
    maxHeight: number,
    blendWidth: number = 2.0
  ): GfxMultiColorConfig {
    const heightRange = maxHeight - minHeight;
    
    return {
      parameter: 'height',
      blendWidth,
      zones: [
        {
          id: 'water',
          name: 'Вода',
          color: '#2e5c8a',
          min: minHeight,
          max: minHeight + heightRange * 0.1
        },
        {
          id: 'sand',
          name: 'Песок',
          color: '#d4b896',
          min: minHeight + heightRange * 0.15,
          max: minHeight + heightRange * 0.25
        },
        {
          id: 'grass',
          name: 'Трава',
          color: '#4a7c59',
          min: minHeight + heightRange * 0.3,
          max: minHeight + heightRange * 0.6
        },
        {
          id: 'rocks',
          name: 'Камни',
          color: '#6b6b6b',
          min: minHeight + heightRange * 0.65,
          max: minHeight + heightRange * 0.85
        },
        {
          id: 'snow',
          name: 'Снег',
          color: '#f0f8ff',
          min: minHeight + heightRange * 0.9,
          max: maxHeight
        }
      ]
    };
  }

  /**
   * Создает предустановленную конфигурацию на основе наклона поверхности.
   * Подходит для выделения склонов и утесов.
   * 
   * @param blendWidth - размер зоны перехода между цветами
   * @returns конфигурация на основе наклона
   */
  static createSlopeBasedPreset(blendWidth: number = 0.1): GfxMultiColorConfig {
    return {
      parameter: 'slope',
      blendWidth,
      zones: [
        {
          id: 'flat',
          name: 'Равнина',
          color: '#4a7c59',
          min: 0,
          max: 0.2
        },
        {
          id: 'gentle_slope',
          name: 'Пологий склон',
          color: '#6b8e5a',
          min: 0.25,
          max: 0.5
        },
        {
          id: 'steep_slope',
          name: 'Крутой склон',
          color: '#8b7355',
          min: 0.55,
          max: 0.8
        },
        {
          id: 'cliff',
          name: 'Утес',
          color: '#5a5a5a',
          min: 0.85,
          max: 1.0
        }
      ]
    };
  }
}