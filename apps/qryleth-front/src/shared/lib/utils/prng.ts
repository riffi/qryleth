/**
 * Утилиты псевдослучайных чисел для детерминированной генерации.
 *
 * Содержит быструю функцию PRNG mulberry32 и вспомогательные функции
 * для создания генератора по числовому или строковому seed.
 */

/**
 * Быстрый детерминированный PRNG: mulberry32.
 *
 * Возвращает функцию-генератор чисел в диапазоне [0, 1).
 * При одном и том же seed последовательность значений идентична.
 *
 * @param seed - 32-битное беззнаковое число, используемое как сид
 * @returns функция () => number, выдающая значения в [0, 1)
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Хеш-функция xfnv1a для преобразования строки в 32-битное беззнаковое число.
 *
 * Удобно использовать для получения числового seed из строкового значения.
 * @param str - входная строка
 * @returns 32-битный беззнаковый хеш
 */
export function xfnv1a(str: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Создаёт генератор псевдослучайных чисел в диапазоне [0, 1).
 *
 * Если seed не задан — возвращает стандартный Math.random (недетерминированно).
 * Если seed — число, используется напрямую (приводится к UInt32).
 * Если seed — строка, преобразуется в число через xfnv1a.
 *
 * @param seed - сид генератора (число или строка)
 * @returns функция () => number, выдающая значения в [0, 1)
 */
export function createRng(seed?: number | string): () => number {
  if (seed === undefined) return Math.random
  const s = typeof seed === 'number' ? seed >>> 0 : xfnv1a(seed)
  return mulberry32(s)
}

