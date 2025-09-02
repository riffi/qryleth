/**
 * Переименовано из PlacementUtils.ts в TerrainPlacementUtils.ts для ясности назначения.
 *
 * Вспомогательные утилиты для алгоритмов размещения точек центров операций.
 *
 * Все координаты интерпретируются в МИРОВЫХ координатах террейна:
 * - Центр мира в (0, 0) по XZ-плоскости.
 * - Полные габариты мира задаются шириной (X) и глубиной (Z).
 * - Прямоугольная область мира: X ∈ [-worldWidth/2 .. +worldWidth/2],
 *   Z ∈ [-worldDepth/2 .. +worldDepth/2].
 */

import type { GfxPlacementArea } from '@/entities/terrain'
import type { BoundRect2D } from '@/shared/types'
import { isInsideBoundRect, randomPointInBoundRect, randomPointInCircle as rndPointInCircle } from '@/shared/lib/math/geometry2d'
import { clamp } from '@/shared/lib/math/number'

/** Тип границ на плоскости XZ для удобства совместимости */
export type WorldRect = BoundRect2D

/**
 * Построить полный мировой прямоугольник по размерам мира.
 * @param worldWidth — ширина мира по X
 * @param worldDepth — глубина мира по Z
 */
export function makeWorldRect(worldWidth: number, worldDepth: number): WorldRect {
  const halfW = worldWidth / 2
  const halfH = worldDepth / 2
  return { minX: -halfW, maxX: halfW, minZ: -halfH, maxZ: halfH }
}

/**
 * Преобразует геометрическую область ограничения (rect/circle) в охватывающий прямоугольник.
 * Если область не задана — возвращает полный мировой прямоугольник.
 * @param worldWidth — ширина мира
 * @param worldDepth — глубина мира
 * @param area — ограничивающая область (прямоугольник или круг)
 */
export function areaToWorldRect(
  worldWidth: number,
  worldDepth: number,
  area?: GfxPlacementArea
): WorldRect {
  if (!area) return makeWorldRect(worldWidth, worldDepth)
  if (area.kind === 'rect') {
    return {
      minX: area.x,
      maxX: area.x + area.width,
      minZ: area.z,
      maxZ: area.z + area.depth
    }
  }
  // circle → прямоугольник, охватывающий круг
  return {
    minX: area.x - area.radius,
    maxX: area.x + area.radius,
    minZ: area.z - area.radius,
    maxZ: area.z + area.radius
  }
}

/**
 * Проверяет, принадлежит ли точка прямоугольнику.
 * @param pX — X точки
 * @param pZ — Z точки
 * @param rect — прямоугольные границы
 */
export function isInsideRect(pX: number, pZ: number, rect: WorldRect): boolean {
  return isInsideBoundRect(rect, pX, pZ)
}

/**
 * Проверяет, принадлежит ли точка заданной области (rect/circle). Если область не задана,
 * используется проверка на попадание в мир целиком.
 * @param worldWidth — ширина мира
 * @param worldDepth — глубина мира
 * @param pX — X точки
 * @param pZ — Z точки
 * @param area — ограничивающая область или undefined
 */
export function isInsideArea(
  worldWidth: number,
  worldDepth: number,
  pX: number,
  pZ: number,
  area?: GfxPlacementArea
): boolean {
  if (!area) {
    return isInsideRect(pX, pZ, makeWorldRect(worldWidth, worldDepth))
  }
  if (area.kind === 'rect') {
    return pX >= area.x && pX <= area.x + area.width && pZ >= area.z && pZ <= area.z + area.depth
  }
  const dx = pX - area.x
  const dz = pZ - area.z
  return dx * dx + dz * dz <= area.radius * area.radius
}

/**
 * Возвращает случайную точку внутри прямоугольника.
 * @param rect — прямоугольные границы
 * @param rng — детерминированный генератор случайных чисел [0..1)
 */
export function randomPointInRect(rect: WorldRect, rng: () => number): [number, number] {
  return randomPointInBoundRect(rect, rng)
}

/**
 * Возвращает случайную точку внутри круговой области.
 * Выбор радиуса делается по корню, чтобы получить равномерное распределение по площади.
 * @param cx — центр X
 * @param cz — центр Z
 * @param radius — радиус круга
 * @param rng — генератор [0..1)
 */
export function randomPointInCircle(
  cx: number,
  cz: number,
  radius: number,
  rng: () => number
): [number, number] {
  return rndPointInCircle(cx, cz, radius, rng)
}

/**
 * Ограничивает значение в заданные пределы.
 * @param v — значение
 * @param min — нижняя граница
 * @param max — верхняя граница
 */
// clamp переиспользуем из shared/lib/math/number

/**
 * Квадрат Евклидова расстояния между двумя точками (x1,z1) и (x2,z2).
 * Без извлечения корня быстрее подходит для сравнений дистанций.
 */
export function dist2(x1: number, z1: number, x2: number, z2: number): number {
  const dx = x1 - x2
  const dz = z1 - z2
  return dx * dx + dz * dz
}
