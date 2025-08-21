/**
 * Доменные типы для системы террейна
 * 
 * Данный файл содержит типы для новой унифицированной системы ландшафтных слоев
 * с поддержкой различных источников данных (Perlin noise, heightmaps) и
 * системы модификаций террейна (TerrainOps).
 */

/**
 * Параметры для генерации Perlin noise
 * Все размеры указаны в сегментах сетки, а не в мировых координатах
 */
export interface GfxPerlinParams {
  /** Сид для детерминированной генерации шума */
  seed: number;
  /** Количество октав для генерации шума */
  octaveCount: number;
  /** Амплитуда шума (максимальная высота) */
  amplitude: number;
  /** Коэффициент затухания для октав */
  persistence: number;
  /** Ширина в сегментах сетки */
  width: number;
  /** Высота в сегментах сетки */
  height: number;
}

/**
 * Параметры для загруженной heightmap из PNG
 */
export interface GfxHeightmapParams {
  /** Идентификатор PNG блоба в Dexie */
  assetId: string;
  /** Ширина изображения в пикселях */
  imgWidth: number;
  /** Высота изображения в пикселях */
  imgHeight: number;
  /** Минимальная высота (уровень моря/нуля) */
  min: number;
  /** Максимальная высота */
  max: number;
  /** Режим обработки краев UV координат */
  wrap?: 'clamp' | 'repeat';
}

/**
 * Источник данных для геометрии террейна
 */
export type GfxTerrainSource =
  | { kind: 'perlin'; params: GfxPerlinParams }
  | { kind: 'heightmap'; params: GfxHeightmapParams }
  | { kind: 'legacy'; data: Float32Array; width: number; height: number }; // для миграции

/**
 * Одна операция модификации рельефа
 */
export interface GfxTerrainOp {
  /** Уникальный идентификатор для редактирования/удаления */
  id: string;
  /** Режим применения смещения */
  mode: 'add' | 'sub' | 'set';
  /** Центр операции в мировых координатах [x, z] */
  center: [number, number];
  /** Сферический радиус влияния в мировых единицах */
  radius: number;
  /** Амплитуда изменения высоты (+/-) */
  intensity: number;
  /** Функция затухания эффекта */
  falloff?: 'smoothstep' | 'gauss' | 'linear';
  /** Радиус по оси Z для эллиптических операций (опционально) */
  radiusZ?: number;
  /** Поворот эллипса в радианах (опционально) */
  rotation?: number;
}

/**
 * Полная конфигурация террейна слоя
 */
export interface GfxTerrainConfig {
  /** Ширина области в мировых координатах */
  worldWidth: number;
  /** Высота области в мировых координатах */
  worldHeight: number;
  /** Плавный спад к краям (0..1 доля от края) */
  edgeFade?: number;
  /** Источник базовых данных высот */
  source: GfxTerrainSource;
  /** Массив операций модификации террейна */
  ops?: GfxTerrainOp[];
}

/**
 * Интерфейс для получения высоты и нормалей террейна
 * Единый источник данных о высотах для рендеринга и размещения объектов
 */
export interface GfxHeightSampler {
  /**
   * Получить высоту в указанной точке мировых координат
   * @param x - координата X в мировой системе координат
   * @param z - координата Z в мировой системе координат
   * @returns высота Y в мировых единицах
   */
  getHeight(x: number, z: number): number;

  /**
   * Получить нормаль поверхности в указанной точке
   * Вычисляется через конечные разности (центральные/встречные)
   * @param x - координата X в мировой системе координат
   * @param z - координата Z в мировой системе координат
   * @returns нормализованный вектор нормали [nx, ny, nz]
   */
  getNormal(x: number, z: number): [number, number, number];
}