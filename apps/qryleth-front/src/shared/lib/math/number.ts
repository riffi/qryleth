/**
 * Числовые утилиты: clamp/lerp/deg↔rad/диапазоны.
 * Все функции чистые и не имеют побочных эффектов.
 */

/**
 * Ограничивает значение в заданный диапазон [min..max].
 * Полезно при ресайзе панелей, нормализации параметров и т.п.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Линейная интерполяция между двумя значениями.
 * Возвращает значение между x0 и x1 при параметре t ∈ [0..1].
 */
export function lerp(x0: number, x1: number, t: number): number {
  return x0 * (1 - t) + x1 * t
}

/**
 * Обратная линейная интерполяция: находит t для значения x в диапазоне [a..b].
 * Если a == b, возвращает 0, чтобы избежать деления на ноль.
 */
export function invLerp(a: number, b: number, x: number): number {
  if (a === b) return 0
  return (x - a) / (b - a)
}

/**
 * Отображает значение x из диапазона [a..b] в диапазон [c..d].
 * При необходимости можно предварительно зажать x в [a..b] с помощью clamp.
 */
export function mapRange(a: number, b: number, c: number, d: number, x: number): number {
  return lerp(c, d, invLerp(a, b, x))
}

/**
 * Ограничение значения в [0..1]. Удобная форма для нормализации коэффициентов.
 */
export function saturate(x: number): number {
  return clamp(x, 0, 1)
}

/**
 * Плавная аппроксимация (smoothstep) для t ∈ [0..1]: t^2 (3 - 2t).
 * Часто используется как функция затухания/сглаживания.
 */
export function smoothstep(t: number): number {
  const tt = saturate(t)
  return tt * tt * (3 - 2 * tt)
}

/**
 * Перевод градусов в радианы.
 */
export function degToRad(deg: number): number {
  return (Math.PI / 180) * deg
}

/**
 * Перевод радиан в градусы.
 */
export function radToDeg(rad: number): number {
  return (180 / Math.PI) * rad
}

