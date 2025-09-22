/**
 * Единый конфиг параметров мультитекстурной раскраски террейна.
 *
 * Все настраиваемые константы собраны здесь для удобства управления.
 */

export interface TerrainTexturingConfig {
  /** Кол-во тайлов по оси в атласе (2 => сетка 2x2 для 4 слоёв) */
  tilesPerAxis: 2 | 4
  /** Пиксели отступа (padding) вокруг каждого тайла для устранения швов */
  paddingPx: number
  /** Минимальный размер атласа (степень двойки) */
  atlasMinSize: number
  /** Максимальный размер атласа (степень двойки) */
  atlasMaxSize: number
  /** Масштаб к числу сегментов для расчёта размера атласа */
  atlasSizeFactor: number
  /** Минимальный размер splatmap (степень двойки) */
  splatMinSize: number
  /** Максимальный размер splatmap (степень двойки) */
  splatMaxSize: number
  /** Масштаб к числу сегментов для расчёта размера splatmap */
  splatSizeFactor: number
  /** Глобальная ширина перехода между слоями по высоте, в метрах */
  blendHeightMeters: number
  /** Влияние нормалей слоя (масштаб XY перед нормализацией) */
  normalInfluence: number
  /** Влияние AO при смешивании (0..1) */
  aoIntensity: number
  /** Экспозиция (множитель яркости albedo) */
  exposure: number
  /** Генерировать мип-карты для CanvasTexture */
  generateMipmaps: boolean
  /**
   * Минимальное число пикселей на один повтор узора внутри тайла атласа.
   * Используется как нижняя планка при расчёте размера атласа, чтобы
   * исключить «мыло» при крупных повторах. Применяется до загрузки изображений
   * (когда их реальный размер ещё неизвестен) и как дополнительная гарантия
   * после загрузки.
   */
  minPxPerRepeat: number
  /** Мультипликатор грубости (roughness), 0..2 */
  roughnessScale: number
  /** Минимальная грубость (чтобы убрать чрезмерный блеск), 0..1 */
  roughnessMin: number
}

/**
 * Конфигурация по умолчанию, соответствующая постановке задачи.
 */
export const TERRAIN_TEXTURING_CONFIG: TerrainTexturingConfig = {
  tilesPerAxis: 2,
  paddingPx: 16,
  atlasMinSize: 1024,
  atlasMaxSize: 4096,
  atlasSizeFactor: 1, // размер атласа ≈ pow2(segments * factor)
  splatMinSize: 1024,
  splatMaxSize: 4096,
  splatSizeFactor: 2, // размер splat ≈ pow2(segments * factor)
  blendHeightMeters: 6.0,
  normalInfluence: 0.6,
  aoIntensity: 0.35,
  exposure: 1.2,
  generateMipmaps: true,
  minPxPerRepeat: 1024,
  roughnessScale: 1.2,
  roughnessMin: 0.55,
}

/**
 * Округлить значение вверх до ближайшей степени двойки.
 * @param v число
 */
export function toPow2Up(v: number): number {
  let p = 1
  while (p < v) p <<= 1
  return p
}

/**
 * Рассчитать размер атласа по числу сегментов террейна.
 * @param segments число сегментов террейна (одинаково по X/Z)
 */
export function computeAtlasSizeFromSegments(segments: number, cfg: TerrainTexturingConfig = TERRAIN_TEXTURING_CONFIG): number {
  const raw = Math.max(1, Math.floor(segments * cfg.atlasSizeFactor))
  const pow = toPow2Up(raw)
  return Math.max(cfg.atlasMinSize, Math.min(cfg.atlasMaxSize, pow))
}

/**
 * Рассчитать размер splatmap по числу сегментов террейна.
 * @param segments число сегментов террейна (одинаково по X/Z)
 */
export function computeSplatSizeFromSegments(segments: number, cfg: TerrainTexturingConfig = TERRAIN_TEXTURING_CONFIG): number {
  const raw = Math.max(1, Math.floor(segments * cfg.splatSizeFactor))
  const pow = toPow2Up(raw)
  return Math.max(cfg.splatMinSize, Math.min(cfg.splatMaxSize, pow))
}
