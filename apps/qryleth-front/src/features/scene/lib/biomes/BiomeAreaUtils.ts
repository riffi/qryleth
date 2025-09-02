import type { Point2, Rect2D, Circle2D, BoundRect2D } from '@/shared/types'
import type { GfxBiome, GfxBiomeArea, GfxBiomeRectArea, GfxBiomeCircleArea, GfxBiomePolygonArea, GfxBiomeEdgeFalloff } from '@/entities/biome'
import { clamp, smoothstep, degToRad } from '@/shared/lib/math/number'

/**
 * Утилиты для работы с областями биома (плоскость XZ).
 *
 * Содержит функции:
 * - проверки попадания точки в область (pointInsideArea)
 * - расчёта границ (bounding box) области
 * - вычисления расстояния от точки до границы области (distanceToEdge)
 * - вычисления коэффициента затухания по краю (fadeWeight)
 * - оценки площади области (estimateArea)
 *
 * Все функции чистые, используют shared-типы и базовую математику из shared/lib.
 */

/**
 * Проверка попадания точки (x,z) в область биома.
 */
export function pointInsideArea(area: GfxBiomeArea, x: number, z: number): boolean {
  if (area.type === 'rect') return pointInsideRotatedRect(area.rect, area.rotationY ?? 0, x, z)
  if (area.type === 'circle') return pointInsideCircle(area.circle, x, z)
  return pointInsidePolygon(area.points, x, z)
}

/**
 * Возвращает ограничивающий прямоугольник BoundRect2D для области биома.
 */
export function getAreaBounds(area: GfxBiomeArea): BoundRect2D {
  if (area.type === 'rect') return rotatedRectBounds(area.rect, area.rotationY ?? 0)
  if (area.type === 'circle') {
    const { x, z, radius } = area.circle
    return { minX: x - radius, maxX: x + radius, minZ: z - radius, maxZ: z + radius }
  }
  return polygonBounds(area.points)
}

/**
 * Вычисляет расстояние от точки до ближайшей границы области (внутри области → >=0).
 * Если точка вне области — расстояние возвращается со знаком минус (отрицательное),
 * что удобно для принятия решений при отбраковке кандидатов.
 */
export function signedDistanceToEdge(area: GfxBiomeArea, x: number, z: number): number {
  if (area.type === 'rect') return signedDistanceToRotatedRect(area.rect, area.rotationY ?? 0, x, z)
  if (area.type === 'circle') return signedDistanceToCircle(area.circle, x, z)
  return signedDistanceToPolygon(area.points, x, z)
}

/**
 * Рассчитывает коэффициент затухания по краю (0..1) с учётом fadeWidth и профиля (linear/smoothstep).
 * Возвращаемое значение умножается на общий вес точки при выборке.
 */
export function fadeWeight(area: GfxBiomeArea, x: number, z: number, edge: GfxBiomeEdgeFalloff): number {
  const d = signedDistanceToEdge(area, x, z)
  if (edge.fadeWidth <= 0) return d >= 0 ? 1 : 0
  // Нормализуем расстояние до [0..1] внутри зоны затухания
  const t = clamp(d / edge.fadeWidth, 0, 1)
  if (edge.fadeCurve === 'linear' || !edge.fadeCurve) return t
  return smoothstep(t)
}

/**
 * Возвращает вес смещения вероятности к центру (+bias) или к краю (-bias).
 * Диапазон edgeBias: [-1..1]. Значение смешивается с fadeWeight на уровне оркестратора.
 *
 * Для положительных значений (к центру) используем (1 - e), где e — нормализованная близость к краю.
 * Для отрицательных — используем e.
 */
export function edgeBiasWeight(area: GfxBiomeArea, x: number, z: number, edge: GfxBiomeEdgeFalloff): number {
  const d = signedDistanceToEdge(area, x, z)
  const fw = edge.fadeWidth > 0 ? clamp(d / edge.fadeWidth, 0, 1) : (d >= 0 ? 1 : 0)
  const e = 1 - fw // близость к краю: 1 у самой границы, 0 в глубине области
  const bias = clamp(edge.edgeBias ?? 0, -1, 1)
  if (bias === 0) return 1
  // Смесь: к центру (bias>0) → (1-e), к краю (bias<0) → e
  const affinity = bias > 0 ? (1 - e) : e
  return 1 * (1 - Math.abs(bias)) + affinity * Math.abs(bias)
}

/**
 * Оценка площади области (для расчёта целевого числа точек по плотности).
 * Прямоугольник: width*depth; круг: PI*r^2; многоугольник: полигональная площадь (shoelace).
 */
export function estimateArea(area: GfxBiomeArea): number {
  if (area.type === 'rect') return area.rect.width * area.rect.depth
  if (area.type === 'circle') return Math.PI * area.circle.radius * area.circle.radius
  return Math.abs(polygonArea(area.points))
}

// ------------------------ Прямоугольник (с поворотом вокруг Y) ------------------------

/**
 * Проверка попадания в прямоугольник с поворотом вокруг Y (в градусах).
 * Метод: переводим точку в локальные координаты прямоугольника и проверяем осевой AABB.
 */
export function pointInsideRotatedRect(rect: Rect2D, rotationY: number, x: number, z: number): boolean {
  const p = worldToRectLocal(rect, rotationY, x, z)
  return p[0] >= 0 && p[0] <= rect.width && p[1] >= 0 && p[1] <= rect.depth
}

/** Возвращает BoundRect2D для повернутого прямоугольника. */
export function rotatedRectBounds(rect: Rect2D, rotationY: number): BoundRect2D {
  const corners = rectWorldCorners(rect, rotationY)
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (const [cx, cz] of corners) {
    if (cx < minX) minX = cx; if (cx > maxX) maxX = cx
    if (cz < minZ) minZ = cz; if (cz > maxZ) maxZ = cz
  }
  return { minX, maxX, minZ, maxZ }
}

/** Подписанная дистанция до границы повернутого прямоугольника: >0 внутри, <0 снаружи. */
export function signedDistanceToRotatedRect(rect: Rect2D, rotationY: number, x: number, z: number): number {
  const p = worldToRectLocal(rect, rotationY, x, z)
  const dx = Math.min(p[0], rect.width - p[0])
  const dz = Math.min(p[1], rect.depth - p[1])
  const inside = p[0] >= 0 && p[0] <= rect.width && p[1] >= 0 && p[1] <= rect.depth
  const dEdge = Math.min(dx, dz)
  return inside ? dEdge : -distanceToAabbEdge(p[0], p[1], rect.width, rect.depth)
}

function worldToRectLocal(rect: Rect2D, rotationY: number, x: number, z: number): Point2 {
  // локальная система: (0,0) в левом‑нижнем углу rect (x,z)
  const lx = x - rect.x
  const lz = z - rect.z
  if ((rotationY ?? 0) === 0) return [lx, lz]
  const rad = degToRad(rotationY)
  // Поворот вокруг центра прямоугольника
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

function rectWorldCorners(rect: Rect2D, rotationY: number): Point2[] {
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

function distanceToAabbEdge(x: number, z: number, w: number, d: number): number {
  const dx = x < 0 ? -x : (x > w ? x - w : 0)
  const dz = z < 0 ? -z : (z > d ? z - d : 0)
  if (dx === 0 && dz === 0) return 0
  return Math.hypot(dx, dz)
}

// ------------------------ Круг ------------------------

export function pointInsideCircle(circle: Circle2D, x: number, z: number): boolean {
  const dx = x - circle.x
  const dz = z - circle.z
  return dx * dx + dz * dz <= circle.radius * circle.radius
}

export function signedDistanceToCircle(circle: Circle2D, x: number, z: number): number {
  const dx = x - circle.x
  const dz = z - circle.z
  const dist = Math.hypot(dx, dz)
  return circle.radius - dist
}

// ------------------------ Многоугольник ------------------------

export function polygonBounds(points: Point2[]): BoundRect2D {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (const [x, z] of points) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (z < minZ) minZ = z; if (z > maxZ) maxZ = z }
  return { minX, maxX, minZ, maxZ }
}

export function pointInsidePolygon(points: Point2[], x: number, z: number): boolean {
  // Алгоритм «ray casting»
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0], zi = points[i][1]
    const xj = points[j][0], zj = points[j][1]
    const intersect = ((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi + 1e-12) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

export function signedDistanceToPolygon(points: Point2[], x: number, z: number): number {
  const inside = pointInsidePolygon(points, x, z)
  const d = distanceToPolygonEdges(points, x, z)
  return inside ? d : -d
}

export function polygonArea(points: Point2[]): number {
  let sum = 0
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [x0, z0] = points[j]
    const [x1, z1] = points[i]
    sum += (x0 * z1 - x1 * z0)
  }
  return 0.5 * sum
}

function distanceToPolygonEdges(points: Point2[], x: number, z: number): number {
  let minDist = Infinity
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [x0, z0] = points[j]
    const [x1, z1] = points[i]
    const d = pointToSegmentDistance(x, z, x0, z0, x1, z1)
    if (d < minDist) minDist = d
  }
  return minDist
}

function pointToSegmentDistance(px: number, pz: number, x0: number, z0: number, x1: number, z1: number): number {
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

