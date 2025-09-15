import type { BoundingBox, Vector3 } from '@/shared/types'
import { add, mul, midpoint, min as v3min, max as v3max } from '@/shared/lib/math/vector3'
import type { GfxPrimitive, GfxObject } from '@/entities'

/**
 * Применяет трансформацию к вектору
 */
function applyTransform(point: Vector3, transform?: {
  position?: Vector3
  rotation?: Vector3
  scale?: Vector3
}): Vector3 {
  if (!transform) return point

  let [x, y, z] = transform.scale ? mul(point, transform.scale) : point

  // Применяем поворот (упрощенно, для базовых углов)
  if (transform.rotation) {
    const [rx, ry, rz] = transform.rotation
    
    // Поворот вокруг X
    if (rx !== 0) {
      const cos = Math.cos(rx)
      const sin = Math.sin(rx)
      const newY = y * cos - z * sin
      const newZ = y * sin + z * cos
      y = newY
      z = newZ
    }
    
    // Поворот вокруг Y
    if (ry !== 0) {
      const cos = Math.cos(ry)
      const sin = Math.sin(ry)
      const newX = x * cos + z * sin
      const newZ = -x * sin + z * cos
      x = newX
      z = newZ
    }
    
    // Поворот вокруг Z
    if (rz !== 0) {
      const cos = Math.cos(rz)
      const sin = Math.sin(rz)
      const newX = x * cos - y * sin
      const newY = x * sin + y * cos
      x = newX
      y = newY
    }
  }

  // Применяем смещение
  if (transform.position) {
    return add([x, y, z], transform.position)
  }

  return [x, y, z]
}

/**
 * Вычисляет BoundingBox для примитива box
 */
function calculateBoxBoundingBox(geometry: { width: number; height: number; depth: number }, transform?: {
  position?: Vector3
  rotation?: Vector3
  scale?: Vector3
}): BoundingBox {
  const halfWidth = geometry.width / 2
  const halfHeight = geometry.height / 2
  const halfDepth = geometry.depth / 2

  // 8 вершин куба
  const vertices: Vector3[] = [
    [-halfWidth, -halfHeight, -halfDepth],
    [halfWidth, -halfHeight, -halfDepth],
    [-halfWidth, halfHeight, -halfDepth],
    [halfWidth, halfHeight, -halfDepth],
    [-halfWidth, -halfHeight, halfDepth],
    [halfWidth, -halfHeight, halfDepth],
    [-halfWidth, halfHeight, halfDepth],
    [halfWidth, halfHeight, halfDepth]
  ]

  // Применяем трансформации ко всем вершинам и агрегируем min/max векторно
  const transformedVertices = vertices.map(v => applyTransform(v, transform))
  const { min, max } = transformedVertices.reduce<{ min: Vector3; max: Vector3 }>((acc, v) => {
    return { min: v3min(acc.min, v), max: v3max(acc.max, v) }
  }, { min: transformedVertices[0], max: transformedVertices[0] })

  return { min, max }
}

/**
 * Вычисляет BoundingBox для примитива sphere
 */
function calculateSphereBoundingBox(geometry: { radius: number }, transform?: {
  position?: Vector3
  rotation?: Vector3
  scale?: Vector3
}): BoundingBox {
  const radius = geometry.radius
  
  // Базовый bounding box сферы
  const baseMin: Vector3 = [-radius, -radius, -radius]
  const baseMax: Vector3 = [radius, radius, radius]

  // Применяем трансформации к угловым точкам и берём поосевые min/max векторно
  const transformedMin = applyTransform(baseMin, transform)
  const transformedMax = applyTransform(baseMax, transform)
  const min: Vector3 = v3min(transformedMin, transformedMax)
  const max: Vector3 = v3max(transformedMin, transformedMax)

  return { min, max }
}

/**
 * Вычисляет BoundingBox для примитива cylinder
 */
function calculateCylinderBoundingBox(geometry: {
  radiusTop: number
  radiusBottom: number
  height: number
}, transform?: {
  position?: Vector3
  rotation?: Vector3
  scale?: Vector3
}): BoundingBox {
  const maxRadius = Math.max(geometry.radiusTop, geometry.radiusBottom)
  const halfHeight = geometry.height / 2

  const baseMin: Vector3 = [-maxRadius, -halfHeight, -maxRadius]
  const baseMax: Vector3 = [maxRadius, halfHeight, maxRadius]

  const transformedMin = applyTransform(baseMin, transform)
  const transformedMax = applyTransform(baseMax, transform)
  const min: Vector3 = v3min(transformedMin, transformedMax)
  const max: Vector3 = v3max(transformedMin, transformedMax)

  return { min, max }
}

/**
 * Вычисляет BoundingBox для примитива cone
 */
function calculateConeBoundingBox(geometry: {
  radius: number
  height: number
}, transform?: {
  position?: Vector3
  rotation?: Vector3
  scale?: Vector3
}): BoundingBox {
  const halfHeight = geometry.height / 2
  
  const baseMin: Vector3 = [-geometry.radius, -halfHeight, -geometry.radius]
  const baseMax: Vector3 = [geometry.radius, halfHeight, geometry.radius]

  const transformedMin = applyTransform(baseMin, transform)
  const transformedMax = applyTransform(baseMax, transform)
  const min: Vector3 = v3min(transformedMin, transformedMax)
  const max: Vector3 = v3max(transformedMin, transformedMax)

  return { min, max }
}

/**
 * Вычисляет BoundingBox для примитива pyramid
 */
function calculatePyramidBoundingBox(geometry: {
  baseSize: number
  height: number
}, transform?: {
  position?: Vector3
  rotation?: Vector3
  scale?: Vector3
}): BoundingBox {
  const halfBase = geometry.baseSize / 2
  const halfHeight = geometry.height / 2

  const baseMin: Vector3 = [-halfBase, -halfHeight, -halfBase]
  const baseMax: Vector3 = [halfBase, halfHeight, halfBase]

  const transformedMin = applyTransform(baseMin, transform)
  const transformedMax = applyTransform(baseMax, transform)
  const min: Vector3 = v3min(transformedMin, transformedMax)
  const max: Vector3 = v3max(transformedMin, transformedMax)

  return { min, max }
}

/**
 * Вычисляет BoundingBox для примитива plane
 */
function calculatePlaneBoundingBox(geometry: {
  width: number
  height: number
}, transform?: {
  position?: Vector3
  rotation?: Vector3
  scale?: Vector3
}): BoundingBox {
  const halfWidth = geometry.width / 2
  const halfHeight = geometry.height / 2

  // Плоскость имеет нулевую толщину по Z
  const baseMin: Vector3 = [-halfWidth, -halfHeight, 0]
  const baseMax: Vector3 = [halfWidth, halfHeight, 0]

  const transformedMin = applyTransform(baseMin, transform)
  const transformedMax = applyTransform(baseMax, transform)

  const min: Vector3 = [
    Math.min(transformedMin[0], transformedMax[0]),
    Math.min(transformedMin[1], transformedMax[1]),
    Math.min(transformedMin[2], transformedMax[2])
  ]

  const max: Vector3 = [
    Math.max(transformedMin[0], transformedMax[0]),
    Math.max(transformedMin[1], transformedMax[1]),
    Math.max(transformedMin[2], transformedMax[2])
  ]

  return { min, max }
}

/**
 * Вычисляет BoundingBox для примитива torus
 */
function calculateTorusBoundingBox(geometry: {
  majorRadius: number
  minorRadius: number
}, transform?: {
  position?: Vector3
  rotation?: Vector3
  scale?: Vector3
}): BoundingBox {
  const outerRadius = geometry.majorRadius + geometry.minorRadius

  const baseMin: Vector3 = [-outerRadius, -geometry.minorRadius, -outerRadius]
  const baseMax: Vector3 = [outerRadius, geometry.minorRadius, outerRadius]

  const transformedMin = applyTransform(baseMin, transform)
  const transformedMax = applyTransform(baseMax, transform)

  const min: Vector3 = [
    Math.min(transformedMin[0], transformedMax[0]),
    Math.min(transformedMin[1], transformedMax[1]),
    Math.min(transformedMin[2], transformedMax[2])
  ]

  const max: Vector3 = [
    Math.max(transformedMin[0], transformedMax[0]),
    Math.max(transformedMin[1], transformedMax[1]),
    Math.max(transformedMin[2], transformedMax[2])
  ]

  return { min, max }
}

/**
 * Вычисляет BoundingBox для произвольного меш‑примитива (по массиву позиций)
 */
function calculateMeshBoundingBox(geometry: { positions: number[] }, transform?: {
  position?: Vector3
  rotation?: Vector3
  scale?: Vector3
}): BoundingBox {
  const pos = geometry.positions || []
  if (pos.length < 3) return { min: [0, 0, 0], max: [0, 0, 0] }
  let minX = pos[0], minY = pos[1], minZ = pos[2]
  let maxX = pos[0], maxY = pos[1], maxZ = pos[2]
  for (let i = 3; i < pos.length; i += 3) {
    const x = pos[i], y = pos[i + 1], z = pos[i + 2]
    if (x < minX) minX = x; if (y < minY) minY = y; if (z < minZ) minZ = z
    if (x > maxX) maxX = x; if (y > maxY) maxY = y; if (z > maxZ) maxZ = z
  }
  const local: BoundingBox = { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] }
  // Применяем полную трансформацию к углам локального бокса
  return transformBoundingBox(local, transform)
}

/**
 * Вычисляет BoundingBox для примитива
 */
export function calculatePrimitiveBoundingBox(primitive: GfxPrimitive): BoundingBox {
  switch (primitive.type) {
    case 'box':
      return calculateBoxBoundingBox(primitive.geometry, primitive.transform)
    case 'sphere':
      return calculateSphereBoundingBox(primitive.geometry, primitive.transform)
    case 'leaf':
      // Лист в объектной схеме хранит radius — используем сферический бокс
      return calculateSphereBoundingBox((primitive as any).geometry, primitive.transform)
    case 'cylinder':
      return calculateCylinderBoundingBox(primitive.geometry, primitive.transform)
    case 'trunk':
    case 'branch':
      // Специализированные цилиндры дерева
      return calculateCylinderBoundingBox((primitive as any).geometry, primitive.transform)
    case 'cone':
      return calculateConeBoundingBox(primitive.geometry, primitive.transform)
    case 'pyramid':
      return calculatePyramidBoundingBox(primitive.geometry, primitive.transform)
    case 'plane':
      return calculatePlaneBoundingBox(primitive.geometry, primitive.transform)
    case 'torus':
      return calculateTorusBoundingBox(primitive.geometry, primitive.transform)
    case 'mesh':
      return calculateMeshBoundingBox((primitive as any).geometry, primitive.transform)
    default:
      // @ts-expect-error - исчерпывающая проверка типов
      throw new Error(`Unsupported primitive type: ${primitive.type}`)
  }
}

/**
 * Объединяет несколько BoundingBox в один
 */
export function mergeBoundingBoxes(boxes: BoundingBox[]): BoundingBox {
  if (boxes.length === 0) {
    throw new Error('Cannot merge empty array of bounding boxes')
  }

  if (boxes.length === 1) {
    return boxes[0]
  }

  const { min, max } = boxes.reduce<{ min: Vector3; max: Vector3 }>((acc, b) => ({
    min: v3min(acc.min, b.min),
    max: v3max(acc.max, b.max)
  }), { min: boxes[0].min, max: boxes[0].max })

  return { min, max }
}

/**
 * Вычисляет BoundingBox для объекта на основе его примитивов
 */
export function calculateObjectBoundingBox(object: GfxObject): BoundingBox {
  if (object.primitives.length === 0) {
    // Возвращаем пустой bounding box для объекта без примитивов
    return { min: [0, 0, 0], max: [0, 0, 0] }
  }

  const primitiveBoundingBoxes = object.primitives.map(calculatePrimitiveBoundingBox)
  return mergeBoundingBoxes(primitiveBoundingBoxes)
}

/**
 * Применяет трансформацию к BoundingBox и возвращает результат
 * в мировых координатах
 */
export function transformBoundingBox(
  box: BoundingBox,
  transform?: { position?: Vector3; rotation?: Vector3; scale?: Vector3 }
): BoundingBox {
  // Перечень углов исходного бокса
  const corners: Vector3[] = [
    [box.min[0], box.min[1], box.min[2]],
    [box.min[0], box.min[1], box.max[2]],
    [box.min[0], box.max[1], box.min[2]],
    [box.min[0], box.max[1], box.max[2]],
    [box.max[0], box.min[1], box.min[2]],
    [box.max[0], box.min[1], box.max[2]],
    [box.max[0], box.max[1], box.min[2]],
    [box.max[0], box.max[1], box.max[2]]
  ]

  const transformed = corners.map(c => applyTransform(c, transform))
  const { min, max } = transformed.reduce<{ min: Vector3; max: Vector3 }>((acc, v) => {
    return { min: v3min(acc.min, v), max: v3max(acc.max, v) }
  }, { min: transformed[0], max: transformed[0] })

  return { min, max }
}

/**
 * Возвращает координаты центра BoundingBox.
 * Используется для позиционирования объектов и камер.
 */
export function getBoundingBoxCenter(box: BoundingBox): Vector3 {
  return midpoint(box.min, box.max)
}

/**
 * Проверяет пересечение двух AABB (axis-aligned bounding boxes) в 3D.
 * Возвращает true, если боксы пересекаются или касаются по любой оси.
 * Чистая геометрия без зависимостей от entities.
 */
export function intersectAABB(box1: BoundingBox, box2: BoundingBox): boolean {
  return !(
    box1.max[0] < box2.min[0] || // box1 левее box2
    box1.min[0] > box2.max[0] || // box1 правее box2
    box1.max[1] < box2.min[1] || // box1 ниже box2
    box1.min[1] > box2.max[1] || // box1 выше box2
    box1.max[2] < box2.min[2] || // box1 «впереди» box2
    box1.min[2] > box2.max[2]    // box1 «позади» box2
  )
}
