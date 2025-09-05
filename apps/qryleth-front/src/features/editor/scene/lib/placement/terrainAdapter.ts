import type { SceneLayer } from '@/entities/scene/types'
import { GfxLayerType, GfxLayerShape } from '@/entities/layer'
import { createGfxHeightSampler } from '@/features/editor/scene/lib/terrain/GfxHeightSampler'
import type { GfxHeightSampler } from '@/entities/terrain'
import type { Vector3 } from '@/shared/types'
import { useSceneStore } from '../../model/sceneStore'

/**
 * Получить GfxHeightSampler для работы с высотами террейна слоя.
 * Возвращает сэмплер или null, если слой не landscape/без конфигурации террейна.
 */
/**
 * Получить GfxHeightSampler для работы с высотами террейна слоя (legacy).
 * Возвращает сэмплер или null, если слой не landscape/без конфигурации террейна.
 * В новой архитектуре данные высот находятся в элементах landscapeContent;
 * для них используйте getHeightSamplerForLandscapeItem.
 */
export const getHeightSamplerForLayer = (layer: SceneLayer) => {
  if (layer.type !== GfxLayerType.Landscape) return null
  if (layer.terrain) return createGfxHeightSampler(layer.terrain)
  return null
}

/**
 * Получить GfxHeightSampler для площадки ландшафта (новая архитектура).
 * Возвращает сэмплер или null, если item не terrain/без конфигурации террейна.
 */
export const getHeightSamplerForLandscapeItem = (
  item: import('@/entities/terrain').GfxLandscape
): GfxHeightSampler | null => {
  if (item.shape !== 'terrain' || !item.terrain) return null
  return createGfxHeightSampler(item.terrain)
}

/**
 * Получить высоту Y в мировой точке (X,Z) для заданного слоя ландшафта.
 * Для не-террейн слоёв возвращает 0.
 */
/**
 * Получить высоту Y в мировой точке (X,Z) для заданного legacy‑слоя ландшафта.
 * Для не‑террейн слоёв возвращает 0. Для новой схемы используйте
 * queryHeightAtCoordinateForItem с элементом landscapeContent.
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
 * Получить высоту Y в мировой точке (X,Z) для площадки ландшафта (новая схема).
 * Если предмет не terrain или сэмплер недоступен — возвращает 0.
 */
export const queryHeightAtCoordinateForItem = (
  item: import('@/entities/terrain').GfxLandscape,
  worldX: number,
  worldZ: number
): number => {
  const sampler = getHeightSamplerForLandscapeItem(item)
  if (!sampler) return 0
  return sampler.getHeight(worldX, worldZ)
}

/**
 * Вычислить нормаль поверхности в мировой точке (X,Z) для слоя ландшафта.
 * Для не-террейн слоёв возвращает [0,1,0].
 */
/**
 * Вычислить нормаль поверхности в мировой точке (X,Z) для legacy‑слоя ландшафта.
 * Для новой схемы используйте calculateSurfaceNormalForItem.
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
 * Вычислить нормаль поверхности в мировой точке (X,Z) для площадки ландшафта.
 * Возвращает [0,1,0], если элемент не terrain/нет сэмплера.
 */
export const calculateSurfaceNormalForItem = (
  item: import('@/entities/terrain').GfxLandscape,
  worldX: number,
  worldZ: number
): Vector3 => {
  const sampler = getHeightSamplerForLandscapeItem(item)
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
 * Проверка попадания мировой точки (x,z) в AABB площадки ландшафта (новая схема).
 */
export const isPointInsideLandscapeItemAabb = (
  item: import('@/entities/terrain').GfxLandscape,
  x: number,
  z: number
): boolean => {
  const cx = item.center?.[0] ?? 0
  const cz = item.center?.[1] ?? 0
  const halfW = (item.size?.width ?? 0) / 2
  const halfD = (item.size?.depth ?? 0) / 2
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
 * Выбрать подходящую площадку ландшафта по мировой координате (x,z) в новой архитектуре.
 * Предпочитает элементы с shape='terrain'. При множественных совпадениях — берёт последний в списке.
 */
export const pickLandscapeItemAt = (
  x: number,
  z: number
): { item: import('@/entities/terrain').GfxLandscape; layerId: string } | null => {
  const content = useSceneStore.getState().landscapeContent
  if (!content || !Array.isArray(content.items) || content.items.length === 0) return null
  const terrainItems = content.items.filter(it => it.shape === 'terrain' && !!it.terrain)
  const candidates = terrainItems.filter(it => isPointInsideLandscapeItemAabb(it, x, z))
  if (candidates.length === 0) return null
  const item = candidates[candidates.length - 1]
  return { item, layerId: content.layerId }
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
  // Новая схема: приоритет площадок landscapeContent
  const picked = pickLandscapeItemAt(x, z)
  if (picked?.item) {
    const sampler = getHeightSamplerForLandscapeItem(picked.item)
    if (sampler) {
      const seaLevel = picked.item.terrain?.seaLevel ?? 0
      // Сформируем псевдо‑слой для совместимости со старым кодом
      const pseudoLayer: SceneLayer = {
        id: picked.layerId,
        name: 'Ландшафт',
        type: GfxLayerType.Landscape,
        visible: true,
        position: 0,
        shape: GfxLayerShape.Terrain as any,
        terrain: picked.item.terrain,
        width: picked.item.size?.width,
        depth: picked.item.size?.depth,
      } as unknown as SceneLayer
      return { sampler, seaLevel, layer: pseudoLayer }
    }
  }

  // Нет подходящей площадки — сэмплер отсутствует
  return null
}
