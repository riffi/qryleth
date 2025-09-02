import type { Vector3 } from '@/shared/types/vector3'
import type { BoundingBox } from '@/shared/types/boundingBox'
import type { SceneLayer, SceneObjectInstance } from '@/entities/scene/types'
import { transformBoundingBox } from '@/shared/lib/geometry/boundingBoxUtils'
import { intersectAABB } from '@/shared/lib/geometry/boundingBoxUtils'
import { queryHeightAtCoordinate } from './terrainAdapter'

/**
 * Параметры генерации позиции без коллизий для случайного размещения.
 */
export interface RandomNoCollisionParams {
  bounds?: { minX?: number; maxX?: number; minZ?: number; maxZ?: number }
  landscapeLayer?: SceneLayer
  existingInstances?: Array<{ instance: SceneObjectInstance; boundingBox: BoundingBox }>
  newObjectBoundingBox?: BoundingBox
  newObjectScale?: Vector3
  rng?: () => number
}

/**
 * Сгенерировать случайную позицию без коллизий (до 100 попыток). Учитывает высоту террейна.
 */
export const generateRandomNoCollisionPosition = (options: RandomNoCollisionParams): Vector3 => {
  const { bounds, landscapeLayer, existingInstances, newObjectBoundingBox } = options
  const rng = options.rng ?? Math.random

  if (!existingInstances || !newObjectBoundingBox) {
    const x = rng() * ((bounds?.maxX ?? 5) - (bounds?.minX ?? -5)) + (bounds?.minX ?? -5)
    const z = rng() * ((bounds?.maxZ ?? 5) - (bounds?.minZ ?? -5)) + (bounds?.minZ ?? -5)
    return [x, 0, z]
  }

  const worldW = landscapeLayer ? (landscapeLayer.terrain?.worldWidth ?? landscapeLayer.width ?? 10) : 10
  const worldH = landscapeLayer ? (landscapeLayer.terrain?.worldHeight ?? landscapeLayer.height ?? 10) : 10
  const centerX = landscapeLayer?.terrain?.center?.[0] ?? 0
  const centerZ = landscapeLayer?.terrain?.center?.[1] ?? 0
  const defaultBounds = {
    minX: centerX - worldW / 2,
    maxX: centerX + worldW / 2,
    minZ: centerZ - worldH / 2,
    maxZ: centerZ + worldH / 2
  }
  const finalBounds = { ...defaultBounds, ...bounds }

  const maxAttempts = 100
  const minDistance = 0.5

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const x = rng() * (finalBounds.maxX - finalBounds.minX) + finalBounds.minX
    const z = rng() * (finalBounds.maxZ - finalBounds.minZ) + finalBounds.minZ
    let y = 0
    if (landscapeLayer) {
      const scaleY = options.newObjectScale?.[1] ?? 1
      const h = queryHeightAtCoordinate(landscapeLayer, x, z)
      y = h - (newObjectBoundingBox.min[1] * scaleY)
    }

    const newWorldBB = transformBoundingBox(newObjectBoundingBox, { position: [x, y, z], scale: [1, 1, 1], rotation: [0, 0, 0] })
    const padded: BoundingBox = {
      min: [newWorldBB.min[0] - minDistance, newWorldBB.min[1] - minDistance, newWorldBB.min[2] - minDistance],
      max: [newWorldBB.max[0] + minDistance, newWorldBB.max[1] + minDistance, newWorldBB.max[2] + minDistance]
    }

    let hasCollision = false
    for (const e of existingInstances) {
      const p = e.instance.transform?.position || [0, 0, 0]
      const s = e.instance.transform?.scale || [1, 1, 1]
      const r = e.instance.transform?.rotation || [0, 0, 0]
      const eBB = transformBoundingBox(e.boundingBox, { position: p, scale: s, rotation: r })
      if (intersectAABB(padded, eBB)) { hasCollision = true; break }
    }
    if (!hasCollision) return [x, y, z]
  }

  const x = rng() * (finalBounds.maxX - finalBounds.minX) + finalBounds.minX
  const z = rng() * (finalBounds.maxZ - finalBounds.minZ) + finalBounds.minZ
  const scaleY = options.newObjectScale?.[1] ?? 1
  const y = landscapeLayer ? queryHeightAtCoordinate(landscapeLayer, x, z) - (newObjectBoundingBox.min[1] * scaleY) : 0
  return [x, y, z]
}

