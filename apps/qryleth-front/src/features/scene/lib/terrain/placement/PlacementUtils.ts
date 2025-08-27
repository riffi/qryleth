/**
 * Вспомогательные утилиты для алгоритмов размещения точек центров операций.
 *
 * Все координаты интерпретируются в МИРОВЫХ координатах террейна:
 * - Центр мира в (0, 0) по XZ-плоскости.
 * - Полные габариты мира задаются шириной (X) и высотой (Z).
 * - Прямоугольная область мира: X ∈ [-worldWidth/2 .. +worldWidth/2],
 *   Z ∈ [-worldHeight/2 .. +worldHeight/2].
 */

import type { GfxPlacementArea } from '@/entities/terrain'

/**
 * Описывает прямоугольные границы в мировых координатах.
 */
export interface WorldRect {
  /** Левая граница по X */
  minX: number
  /** Правая граница по X */
  maxX: number
  /** Нижняя граница по Z (минимум) */
  minZ: number
  /** Верхняя граница по Z (максимум) */
  maxZ: number
}

/**
 * Построить полный мировой прямоугольник по размерам мира.
 * @param worldWidth — ширина мира по X
 * @param worldHeight — высота мира по Z
 */
export function makeWorldRect(worldWidth: number, worldHeight: number): WorldRect {
  const halfW = worldWidth / 2
  const halfH = worldHeight / 2
  return { minX: -halfW, maxX: halfW, minZ: -halfH, maxZ: halfH }
}

/**
 * Преобразует геометрическую область ограничения (rect/circle) в охватывающий прямоугольник.
 * Если область не задана — возвращает полный мировой прямоугольник.
 * @param worldWidth — ширина мира
 * @param worldHeight — высота мира
 * @param area — ограничивающая область (прямоугольник или круг)
 */
export function areaToWorldRect(
  worldWidth: number,
  worldHeight: number,
  area?: GfxPlacementArea
): WorldRect {
  if (!area) return makeWorldRect(worldWidth, worldHeight)
  if (area.kind === 'rect') {
    return {
      minX: area.x,
      maxX: area.x + area.width,
      minZ: area.y,
      maxZ: area.y + area.height
    }
  }
  // circle → прямоугольник, охватывающий круг
  return {
    minX: area.x - area.radius,
    maxX: area.x + area.radius,
    minZ: area.y - area.radius,
    maxZ: area.y + area.radius
  }
}

/**
 * Проверяет, принадлежит ли точка прямоугольнику.
 * @param pX — X точки
 * @param pZ — Z точки
 * @param rect — прямоугольные границы
 */
export function isInsideRect(pX: number, pZ: number, rect: WorldRect): boolean {
  return pX >= rect.minX && pX <= rect.maxX && pZ >= rect.minZ && pZ <= rect.maxZ
}

/**
 * Проверяет, принадлежит ли точка заданной области (rect/circle). Если область не задана,
 * используется проверка на попадание в мир целиком.
 * @param worldWidth — ширина мира
 * @param worldHeight — высота мира
 * @param pX — X точки
 * @param pZ — Z точки
 * @param area — ограничивающая область или undefined
 */
export function isInsideArea(
  worldWidth: number,
  worldHeight: number,
  pX: number,
  pZ: number,
  area?: GfxPlacementArea
): boolean {
  if (!area) {
    return isInsideRect(pX, pZ, makeWorldRect(worldWidth, worldHeight))
  }
  if (area.kind === 'rect') {
    return pX >= area.x && pX <= area.x + area.width && pZ >= area.y && pZ <= area.y + area.height
  }
  const dx = pX - area.x
  const dz = pZ - area.y
  return dx * dx + dz * dz <= area.radius * area.radius
}

/**
 * Возвращает случайную точку внутри прямоугольника.
 * @param rect — прямоугольные границы
 * @param rng — детерминированный генератор случайных чисел [0..1)
 */
export function randomPointInRect(rect: WorldRect, rng: () => number): [number, number] {
  const x = rect.minX + (rect.maxX - rect.minX) * rng()
  const z = rect.minZ + (rect.maxZ - rect.minZ) * rng()
  return [x, z]
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
  const ang = 2 * Math.PI * rng()
  const r = radius * Math.sqrt(rng())
  const x = cx + r * Math.cos(ang)
  const z = cz + r * Math.sin(ang)
  return [x, z]
}

/**
 * Ограничивает значение в заданные пределы.
 * @param v — значение
 * @param min — нижняя граница
 * @param max — верхняя граница
 */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/**
 * Квадрат Евклидова расстояния между двумя точками (x1,z1) и (x2,z2).
 * Без извлечения корня быстрее подходит для сравнений дистанций.
 */
export function dist2(x1: number, z1: number, x2: number, z2: number): number {
  const dx = x1 - x2
  const dz = z1 - z2
  return dx * dx + dz * dz
}

