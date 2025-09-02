import type { BoundingBox } from '@/shared/types/boundingBox'
import type { Vector3 } from '@/shared/types/vector3'
import type { SceneObjectInstance } from '@/entities/scene/types'
import { transformBoundingBox, getBoundingBoxCenter, intersectAABB } from '@/shared/lib/geometry/boundingBoxUtils'
import type { PlaceAroundMetadata } from './strategies'

/**
 * Валидирует входные метаданные стратегии PlaceAround.
 * Бросает исключение при некорректных значениях.
 */
export const validatePlaceAroundMetadata = (metadata: PlaceAroundMetadata): void => {
  if (!metadata.targetInstanceUuid && !metadata.targetObjectUuid) {
    throw new Error('PlaceAround: требуется targetInstanceUuid или targetObjectUuid')
  }
  if (metadata.minDistance < 0) {
    throw new Error('PlaceAround: minDistance должен быть >= 0')
  }
  if (metadata.maxDistance <= metadata.minDistance) {
    throw new Error('PlaceAround: maxDistance должен быть > minDistance')
  }
}

/**
 * Сгенерировать позицию для нового объекта вокруг целевого, учитывая коллизии.
 * Выполняет до 100 попыток подбора позиции без пересечений AABB.
 */
export const generatePlaceAroundPosition = (
  metadata: PlaceAroundMetadata,
  existingInstances: Array<{ instance: SceneObjectInstance; boundingBox: BoundingBox }>,
  newObjectBoundingBox: BoundingBox,
  instanceIndex: number,
  totalInstancesCount: number,
  rng: () => number
): Vector3 => {
  validatePlaceAroundMetadata(metadata)

  let targets: Array<{ instance: SceneObjectInstance; boundingBox: BoundingBox }> = []
  if (metadata.targetInstanceUuid) {
    const t = existingInstances.find(({ instance }) => instance.uuid === metadata.targetInstanceUuid)
    if (!t) throw new Error(`PlaceAround: не найден target instance ${metadata.targetInstanceUuid}`)
    targets = [t]
  } else if (metadata.targetObjectUuid) {
    targets = existingInstances.filter(({ instance }) => instance.objectUuid === metadata.targetObjectUuid)
    if (targets.length === 0) throw new Error(`PlaceAround: нет инстансов объекта ${metadata.targetObjectUuid}`)
  }

  const targetIndex = instanceIndex % targets.length
  const { instance: targetInstance, boundingBox: targetBB } = targets[targetIndex]
  const targetPos = targetInstance.transform?.position || [0, 0, 0]
  const targetScale = targetInstance.transform?.scale || [1, 1, 1]
  const targetRot = targetInstance.transform?.rotation || [0, 0, 0]

  const targetWorldBB = transformBoundingBox(targetBB, { position: targetPos, scale: targetScale, rotation: targetRot })
  const targetCenter: Vector3 = getBoundingBoxCenter(targetWorldBB)
  const targetRadius = Math.max(
    targetWorldBB.max[0] - targetWorldBB.min[0],
    targetWorldBB.max[2] - targetWorldBB.min[2]
  ) / 2

  const newRadius = Math.max(
    newObjectBoundingBox.max[0] - newObjectBoundingBox.min[0],
    newObjectBoundingBox.max[2] - newObjectBoundingBox.min[2]
  ) / 2

  const maxAttempts = 100
  const minGap = 0.5
  const onlyHorizontal = metadata.onlyHorizontal !== false
  const distributeEvenly = metadata.distributeEvenly !== false

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const edgeToEdge = rng() * (metadata.maxDistance - metadata.minDistance) + metadata.minDistance
    const centerDist = edgeToEdge + targetRadius + newRadius

    let angle: number
    if (distributeEvenly) {
      const step = (2 * Math.PI) / totalInstancesCount
      const base = (metadata.angleOffset || 0) + instanceIndex * step
      const jitter = attempt > 0 ? (rng() - 0.5) * 0.2 * step : 0
      angle = base + jitter
    } else {
      angle = (metadata.angleOffset || 0) + rng() * 2 * Math.PI
    }

    const newX = targetCenter[0] + centerDist * Math.cos(angle)
    const newZ = targetCenter[2] + centerDist * Math.sin(angle)
    const newY = onlyHorizontal ? targetCenter[1] : targetPos[1] + (rng() - 0.5) * (centerDist)

    const candidate = transformBoundingBox(newObjectBoundingBox, {
      position: [newX, newY, newZ],
      scale: [1, 1, 1],
      rotation: [0, 0, 0]
    })

    const padded: BoundingBox = {
      min: [candidate.min[0] - minGap, candidate.min[1] - minGap, candidate.min[2] - minGap],
      max: [candidate.max[0] + minGap, candidate.max[1] + minGap, candidate.max[2] + minGap]
    }

    let collides = false
    for (const e of existingInstances) {
      const p = e.instance.transform?.position || [0, 0, 0]
      const s = e.instance.transform?.scale || [1, 1, 1]
      const r = e.instance.transform?.rotation || [0, 0, 0]
      const eBB = transformBoundingBox(e.boundingBox, { position: p, scale: s, rotation: r })
      if (intersectAABB(padded, eBB)) { collides = true; break }
    }
    if (!collides) return [newX, newY, newZ]
  }

  console.warn(`PlaceAround: не нашли позицию без коллизий за ${maxAttempts} попыток — возвращаем fallback`)
  const fallbackEdge = (metadata.minDistance + metadata.maxDistance) / 2
  const fallbackDist = fallbackEdge + targetRadius + newRadius
  const fallbackAngle = distributeEvenly
    ? (metadata.angleOffset || 0) + instanceIndex * (2 * Math.PI) / totalInstancesCount
    : (metadata.angleOffset || 0) + rng() * 2 * Math.PI
  const x = targetPos[0] + fallbackDist * Math.cos(fallbackAngle)
  const z = targetPos[2] + fallbackDist * Math.sin(fallbackAngle)
  const y = onlyHorizontal ? targetPos[1] : targetPos[1] + (rng() - 0.5) * fallbackDist
  return [x, y, z]
}

