import type { SceneLayer } from '@/entities/scene/types'
import { GfxLayerType, GfxLayerShape } from '@/entities/layer'
import { createGfxHeightSampler } from '@/features/editor/scene/lib/terrain/GfxHeightSampler'
import type { GfxHeightSampler } from '@/entities/terrain'
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

/**
 * Проверка попадания мировой точки (x,z) в AABB террейн-слоя.
 *
 * Учитывает размеры `terrain.worldWidth/worldDepth` и центр `terrain.center`.
 * Плоскостные слои без `terrain` считаются неподходящими.
 */
export const isPointInsideTerrainLayerAabb = (layer: SceneLayer, x: number, z: number): boolean => {
  if (layer.type !== GfxLayerType.Landscape) return false
  const t = layer.terrain
  if (!t) return false
  const cx = t.center?.[0] ?? 0
  const cz = t.center?.[1] ?? 0
  const halfW = (t.worldWidth ?? layer.width ?? 0) / 2
  const halfD = (t.worldDepth ?? (layer as any).depth ?? layer.depth ?? 0) / 2
  return (x >= cx - halfW && x <= cx + halfW && z >= cz - halfD && z <= cz + halfD)
}

/**
 * Выбрать подходящий landscape-слой по мировой координате (x,z).
 *
 * Приоритет выбора:
 * 1) Слои с формой `GfxLayerShape.Terrain` выше слоёв другого типа Landscape.
 * 2) Из оставшихся — слой с наибольшим `position` (верхний в списке).
 * 3) Если ничего не найдено — возвращает undefined.
 */
export const pickLandscapeLayerAt = (layers: SceneLayer[], x: number, z: number): SceneLayer | undefined => {
  const candidates = layers.filter(l => isPointInsideTerrainLayerAabb(l, x, z))
  if (candidates.length === 0) return undefined
  // Сортируем по приоритету: Terrain сначала, затем по position по убыванию
  const byPriority = [...candidates].sort((a, b) => {
    const aTerrain = a.shape === GfxLayerShape.Terrain ? 1 : 0
    const bTerrain = b.shape === GfxLayerShape.Terrain ? 1 : 0
    if (aTerrain !== bTerrain) return bTerrain - aTerrain
    return (b.position ?? 0) - (a.position ?? 0)
  })
  return byPriority[0]
}

/**
 * Получить высотный сэмплер террейна для мировой точки (x,z).
 *
 * - Находит подходящий слой по AABB (см. pickLandscapeLayerAt)
 * - Возвращает объект с сэмплером, уровнем моря seaLevel и слоем
 * - Если подходящего слоя нет — возвращает null
 */
export const getTerrainSamplerAt = (
  layers: SceneLayer[],
  x: number,
  z: number
): { sampler: GfxHeightSampler; seaLevel: number; layer: SceneLayer } | null => {
  const layer = pickLandscapeLayerAt(layers, x, z)
  if (!layer) return null
  const sampler = getHeightSamplerForLayer(layer)
  if (!sampler) return null
  const seaLevel = layer.terrain?.seaLevel ?? 0
  return { sampler, seaLevel, layer }
}
