/**
 * Перечисление типов слоёв графической сцены.
 * Используется вместо строковых литералов для повышения типобезопасности
 * и единообразия использования по всему коду проекта.
 */
export enum GfxLayerType {
  /** Слой для обычных объектов сцены */
  Object = 'object',
  /** Слой ландшафта (террейна) */
  Landscape = 'landscape',
  /** Слой воды */
  Water = 'water',
}

export interface GfxLayer {
  id: string;
  name: string;
  /** Тип слоя, заданный перечислением GfxLayerType */
  type?: GfxLayerType;
  width?: number;
  height?: number;
  shape?: 'plane' | 'perlin';
  noiseData?: number[];
  color?: string;
}
