import type { SceneLayer } from '@/entities/scene/types'
import { GfxLayerType } from '@/entities/layer'
import { createGfxHeightSampler } from '@/features/editor/scene/lib/terrain/GfxHeightSampler'
import type { Vector3 } from '@/shared/types'

/**
 * Получить GfxHeightSampler для работы с высотами террейна слоя.
 * Возвращает сэмплер или null, если слой не landscape/без конфигурации террейна.
 */
export const getHeightSamplerForLayer = (layer: SceneLayer) => {
  if (layer.type !== GfxLayerType.Landscape) return null
  if (layer.terrain) return createGfxHeightSampler(layer.terrain)
  return null
}

/**
 * Получить высоту Y в мировой точке (X,Z) для заданного слоя ландшафта.
 * Для не-террейн слоёв возвращает 0.
 */
export const queryHeightAtCoordinate = (
  layer: SceneLayer,
  worldX: number,
  worldZ: number
): number => {
  const sampler = getHeightSamplerForLayer(layer)
  if (!sampler) return 0
  return sampler.getHeight(worldX, worldZ)
}

/**
 * Вычислить нормаль поверхности в мировой точке (X,Z) для слоя ландшафта.
 * Для не-террейн слоёв возвращает [0,1,0].
 */
export const calculateSurfaceNormal = (
  layer: SceneLayer,
  worldX: number,
  worldZ: number
): Vector3 => {
  const sampler = getHeightSamplerForLayer(layer)
  if (!sampler) return [0, 1, 0]
  return sampler.getNormal(worldX, worldZ)
}

