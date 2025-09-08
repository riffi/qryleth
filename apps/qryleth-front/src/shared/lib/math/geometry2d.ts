import type { BoundRect2D, Rect2D, Circle2D, Point2 } from '@/shared/types'
import { degToRad } from '@/shared/lib/math/number'

/**
 * Проверяет принадлежность точки (x,z) прямоугольнику границ в плоскости XZ.
 */
export function isInsideBoundRect(rect: BoundRect2D, x: number, z: number): boolean {
  return x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ
}

/**
 * Возвращает случайную точку [x,z] внутри прямоугольника границ.
 * rng — генератор [0..1).
 */
export function randomPointInBoundRect(rect: BoundRect2D, rng: () => number): [number, number] {
  const x = rect.minX + (rect.maxX - rect.minX) * rng()
  const z = rect.minZ + (rect.maxZ - rect.minZ) * rng()
  return [x, z]
}

/**
 * Возвращает случайную точку [x,z] внутри круга по центру и радиусу.
 * Радиус берётся по корню для равномерного распределения по площади.
 */
export function randomPointInCircle(cx: number, cz: number, radius: number, rng: () => number): [number, number] {
  const ang = 2 * Math.PI * rng()
  const r = radius * Math.sqrt(rng())
  const x = cx + r * Math.cos(ang)
  const z = cz + r * Math.sin(ang)
  return [x, z]
}

/**
 * Проверяет попадание точки (x,z) в осевой прямоугольник Rect2D.
 * Rect2D задан левым‑нижним углом (x,z) и размерами width, depth.
 */
export function pointInsideRect(rect: Rect2D, x: number, z: number): boolean {
  return x >= rect.x && x <= rect.x + rect.width && z >= rect.z && z <= rect.z + rect.depth
}

/**
 * Преобразует осевой прямоугольник Rect2D в ограничивающий прямоугольник BoundRect2D.
 * Удобно для расчёта AABB и алгоритмов сеточного отбора.
 */
export function rectToBounds(rect: Rect2D): BoundRect2D {
  return { minX: rect.x, maxX: rect.x + rect.width, minZ: rect.z, maxZ: rect.z + rect.depth }
}

/**
 * Возвращает случайную точку [x,z] внутри осевого прямоугольника Rect2D.
 * Используется равномерная выборка по площади.
 */
export function randomPointInRect(rect: Rect2D, rng: () => number): [number, number] {
  const x = rect.x + rect.width * rng()
  const z = rect.z + rect.depth * rng()
  return [x, z]
}

/**
 * Проверяет попадание точки (x,z) в окружность Circle2D.
 */
export function pointInsideCircle(c: Circle2D, x: number, z: number): boolean {
  const dx = x - c.x
  const dz = z - c.z
  return dx * dx + dz * dz <= c.radius * c.radius
}

/**
 * Возвращает случайную точку [x,z] внутри окружности Circle2D.
 * Радиус берётся по корню для равномерного распределения по площади.
 */
export function randomPointInCircle2D(c: Circle2D, rng: () => number): [number, number] {
  return randomPointInCircle(c.x, c.z, c.radius, rng)
}

/**
 * Возвращает ограничивающий прямоугольник BoundRect2D для окружности Circle2D.
 * Полезно для оценки площади и построения сеток выборки.
 */
export function circleToBounds(circle: Circle2D): BoundRect2D {
  const { x, z, radius } = circle
  return { minX: x - radius, maxX: x + radius, minZ: z - radius, maxZ: z + radius }
}

/**
 * Подписанное расстояние до круга: положительное внутри, отрицательное снаружи.
 */
export function signedDistanceToCircle(circle: Circle2D, x: number, z: number): number {
  const dx = x - circle.x
  const dz = z - circle.z
  const dist = Math.hypot(dx, dz)
  return circle.radius - dist
}

// ------------------------ Повернутый прямоугольник ------------------------

/**
 * Проверяет попадание точки (x,z) в повернутый прямоугольник.
 * rotationY — угол в градусах, поворот вокруг центра прямоугольника (ось Y).
 */
export function pointInsideRotatedRect(rect: Rect2D, rotationY: number, x: number, z: number): boolean {
  const p = worldToRectLocal(rect, rotationY, x, z)
  return p[0] >= 0 && p[0] <= rect.width && p[1] >= 0 && p[1] <= rect.depth
}

/**
 * Возвращает BoundRect2D, ограничивающий повернутый прямоугольник.
 */
export function rotatedRectBounds(rect: Rect2D, rotationY: number): BoundRect2D {
  if ((rotationY ?? 0) === 0) return rectToBounds(rect)
  const pts = rectWorldCorners(rect, rotationY)
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (const [x, z] of pts) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (z < minZ) minZ = z; if (z > maxZ) maxZ = z }
  return { minX, maxX, minZ, maxZ }
}

/**
 * Подписанное расстояние до границы повернутого прямоугольника (внутри → >= 0).
 */
export function signedDistanceToRotatedRect(rect: Rect2D, rotationY: number, x: number, z: number): number {
  const p = worldToRectLocal(rect, rotationY, x, z)
  const dx = Math.min(p[0], rect.width - p[0])
  const dz = Math.min(p[1], rect.depth - p[1])
  const inside = p[0] >= 0 && p[0] <= rect.width && p[1] >= 0 && p[1] <= rect.depth
  const dEdge = Math.min(dx, dz)
  return inside ? dEdge : -distanceToAabbEdge(p[0], p[1], rect.width, rect.depth)
}

/**
 * Переводит мировую точку (x,z) в локальные координаты прямоугольника (0..width, 0..depth)
 * с учётом поворота вокруг центра. rotationY — градусы.
 */
export function worldToRectLocal(rect: Rect2D, rotationY: number, x: number, z: number): Point2 {
  const lx = x - rect.x
  const lz = z - rect.z
  if ((rotationY ?? 0) === 0) return [lx, lz]
  const rad = degToRad(rotationY)
  const cx = rect.width / 2
  const cz = rect.depth / 2
  const px = lx - cx
  const pz = lz - cz
  const cos = Math.cos(-rad)
  const sin = Math.sin(-rad)
  const rx = px * cos - pz * sin
  const rz = px * sin + pz * cos
  return [rx + cx, rz + cz]
}

/**
 * Возвращает мировые углы (четыре точки) прямоугольника с учётом поворота (градусы).
 */
export function rectWorldCorners(rect: Rect2D, rotationY: number): Point2[] {
  const pts: Point2[] = [
    [rect.x, rect.z],
    [rect.x + rect.width, rect.z],
    [rect.x + rect.width, rect.z + rect.depth],
    [rect.x, rect.z + rect.depth],
  ]
  if ((rotationY ?? 0) === 0) return pts
  const rad = degToRad(rotationY)
  const cx = rect.x + rect.width / 2
  const cz = rect.z + rect.depth / 2
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return pts.map(([x, z]) => {
    const px = x - cx
    const pz = z - cz
    const rx = px * cos - pz * sin
    const rz = px * sin + pz * cos
    return [rx + cx, rz + cz]
  })
}

/**
 * Расстояние от точки (x,z) до ребра осевого AABB [0..w]×[0..d] в локальных координатах.
 */
export function distanceToAabbEdge(x: number, z: number, w: number, d: number): number {
  const dx = x < 0 ? -x : (x > w ? x - w : 0)
  const dz = z < 0 ? -z : (z > d ? z - d : 0)
  if (dx === 0 && dz === 0) return 0
  return Math.hypot(dx, dz)
}

// ------------------------ Многоугольник ------------------------

/**
 * Ограничивающий прямоугольник для множества точек многоугольника.
 */
export function polygonBounds(points: Point2[]): BoundRect2D {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (const [x, z] of points) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (z < minZ) minZ = z; if (z > maxZ) maxZ = z }
  return { minX, maxX, minZ, maxZ }
}

/**
 * Проверка попадания точки (x,z) в произвольный многоугольник (алгоритм ray casting).
 */
export function pointInsidePolygon(points: Point2[], x: number, z: number): boolean {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0], zi = points[i][1]
    const xj = points[j][0], zj = points[j][1]
    const intersect = ((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi + 1e-12) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Подписанное расстояние до границы многоугольника (внутри → >= 0).
 */
export function signedDistanceToPolygon(points: Point2[], x: number, z: number): number {
  const inside = pointInsidePolygon(points, x, z)
  const d = distanceToPolygonEdges(points, x, z)
  return inside ? d : -d
}

/**
 * Площадь многоугольника по формуле Грина (ориентированная; модуль — площадь).
 */
export function polygonArea(points: Point2[]): number {
  let sum = 0
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [x0, z0] = points[j]
    const [x1, z1] = points[i]
    sum += (x0 * z1 - x1 * z0)
  }
  return 0.5 * sum
}

/**
 * Минимальное расстояние от точки до рёбер многоугольника.
 */
export function distanceToPolygonEdges(points: Point2[], x: number, z: number): number {
  let minDist = Infinity
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [x0, z0] = points[j]
    const [x1, z1] = points[i]
    const d = pointToSegmentDistance(x, z, x0, z0, x1, z1)
    if (d < minDist) minDist = d
  }
  return minDist
}

/**
 * Расстояние от точки до отрезка (x0,z0)–(x1,z1).
 */
export function pointToSegmentDistance(px: number, pz: number, x0: number, z0: number, x1: number, z1: number): number {
  const vx = x1 - x0, vz = z1 - z0
  const wx = px - x0, wz = pz - z0
  const c1 = vx * wx + vz * wz
  if (c1 <= 0) return Math.hypot(px - x0, pz - z0)
  const c2 = vx * vx + vz * vz
  if (c2 <= c1) return Math.hypot(px - x1, pz - z1)
  const t = c1 / c2
  const projx = x0 + t * vx, projz = z0 + t * vz
  return Math.hypot(px - projx, pz - projz)
}
