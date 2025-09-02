import type { Vector3 } from '@/shared/types'

/**
 * Базовые операции с вектором Vector3 (кортеж [x,y,z]).
 * Реализация предельно простая и независимая от Three.js.
 */

/** Создаёт копию вектора. */
export function v3(x: number, y: number, z: number): Vector3 { return [x, y, z] }

/** Поэлементное сложение векторов. */
export function add(a: Vector3, b: Vector3): Vector3 { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]] }

/** Поэлементное вычитание векторов (a - b). */
export function sub(a: Vector3, b: Vector3): Vector3 { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]] }

/** Поэлементное умножение векторов. */
export function mul(a: Vector3, b: Vector3): Vector3 { return [a[0]*b[0], a[1]*b[1], a[2]*b[2]] }

/** Компонентное деление векторов (a / b). Полезно для обратного масштабирования. */
export function div(a: Vector3, b: Vector3): Vector3 { return [a[0]/b[0], a[1]/b[1], a[2]/b[2]] }

/** Масштабирование вектора на скаляр s. */
export function scale(a: Vector3, s: number): Vector3 { return [a[0]*s, a[1]*s, a[2]*s] }

/** Скалярное произведение. */
export function dot(a: Vector3, b: Vector3): number { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2] }

/** Векторное произведение. */
export function cross(a: Vector3, b: Vector3): Vector3 {
  return [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0],
  ]
}

/** Длина (модуль) вектора. */
export function length(a: Vector3): number { return Math.hypot(a[0], a[1], a[2]) }

/** Нормализация: возвращает единичный вектор (или [0,1,0] при почти нулевой длине). */
export function normalize(a: Vector3): Vector3 {
  const len = length(a)
  if (len <= 1e-8) return [0, 1, 0]
  return [a[0]/len, a[1]/len, a[2]/len]
}

/** Евклидово расстояние между точками a и b. */
export function distance(a: Vector3, b: Vector3): number { return length(sub(a, b)) }

/** Мин/макс по компонентам двух векторов. */
export function min(a: Vector3, b: Vector3): Vector3 { return [Math.min(a[0],b[0]), Math.min(a[1],b[1]), Math.min(a[2],b[2])] }
export function max(a: Vector3, b: Vector3): Vector3 { return [Math.max(a[0],b[0]), Math.max(a[1],b[1]), Math.max(a[2],b[2])] }

/** Точка посередине между a и b. */
export function midpoint(a: Vector3, b: Vector3): Vector3 { return [(a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2] }
