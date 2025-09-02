import type { BoundRect2D } from '@/shared/types'

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
 * Возвращает случайную точку [x,z] внутри круга.
 * Радиус берётся по корню для равномерного распределения по площади.
 */
export function randomPointInCircle(cx: number, cz: number, radius: number, rng: () => number): [number, number] {
  const ang = 2 * Math.PI * rng()
  const r = radius * Math.sqrt(rng())
  const x = cx + r * Math.cos(ang)
  const z = cz + r * Math.sin(ang)
  return [x, z]
}

