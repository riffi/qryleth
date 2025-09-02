import type { GfxHeightmapParams } from '@/entities/terrain'
import { worldToUV, applyWrap } from '@/features/editor/scene/lib/terrain/sampling/uv'
import { sampleHeightsFieldBilinear, sampleImageDataBilinear } from '@/features/editor/scene/lib/terrain/sampling/bilinear'

/**
 * Утилиты для выборки высоты из heightmap-источника.
 * Содержит чистые функции, выполняющие преобразование world->UV и билинейную
 * интерполяцию по полю высот или ImageData. Саму загрузку/кэш берите из assets-модуля.
 */

/**
 * Семплинг по числовому полю высот (предпочтительный путь).
 *
 * @param x — мировая X
 * @param z — мировая Z
 * @param worldWidth — ширина мира X
 * @param worldDepth — глубина мира Z
 * @param params — параметры heightmap (min/max, wrap)
 * @param heights — массив высот [0..1]
 * @param width — ширина решётки высот
 * @param height — высота решётки высот
 */
export function sampleHeightFromHeightsField(
  x: number,
  z: number,
  worldWidth: number,
  worldDepth: number,
  params: GfxHeightmapParams,
  heights: Float32Array,
  width: number,
  height: number
): number {
  let [u, v] = worldToUV(x, z, worldWidth, worldDepth)
  ;[u, v] = applyWrap(u, v, params.wrap || 'clamp')
  const px = u * (width - 1)
  const py = v * (height - 1)
  const h01 = sampleHeightsFieldBilinear(heights, width, height, px, py)
  return params.min + (params.max - params.min) * h01
}

/**
 * Семплинг по ImageData (RGBA) как фоллбэк, если числовые высоты недоступны.
 *
 * @param x — мировая X
 * @param z — мировая Z
 * @param worldWidth — ширина мира X
 * @param worldDepth — глубина мира Z
 * @param params — параметры heightmap (min/max, wrap, imgWidth/imgHeight — справочные)
 * @param imageData — пиксельные данные PNG
 */
export function sampleHeightFromImageData(
  x: number,
  z: number,
  worldWidth: number,
  worldDepth: number,
  params: GfxHeightmapParams,
  imageData: ImageData
): number {
  let [u, v] = worldToUV(x, z, worldWidth, worldDepth)
  ;[u, v] = applyWrap(u, v, params.wrap || 'clamp')
  const px = u * (imageData.width - 1)
  const py = v * (imageData.height - 1)
  const h01 = sampleImageDataBilinear(imageData, px, py)
  return params.min + (params.max - params.min) * h01
}
