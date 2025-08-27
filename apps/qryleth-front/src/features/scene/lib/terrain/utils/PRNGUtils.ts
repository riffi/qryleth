/**
 * Вспомогательные утилиты для работы с детерминированными PRNG потоками.
 *
 * Предоставляет функции разветвления сидов на подпотоки, а также удобные
 * выборки из диапазонов (числовые и целочисленные) для генерации параметров
 * рецептов и операций террейна.
 */

import { mulberry32, xfnv1a } from '@/shared/lib/utils/prng'

/**
 * Преобразовать произвольную метку (число/строка) в 32-битный хеш.
 * Используется для детерминированного разветвления seed'ов.
 */
export function hashLabel(label: number | string): number {
  if (typeof label === 'number') {
    // простая смесь для числовых меток
    let h = label >>> 0
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return h >>> 0
  }
  return xfnv1a(label)
}

/**
 * Разветвляет базовый seed на новый, учитывая метку.
 * Позволяет получать независимые подпотоки случайных чисел.
 * @param baseSeed — базовый 32-битный seed
 * @param label — метка под‑потока (строка/число)
 */
export function splitSeed(baseSeed: number, label: number | string): number {
  const h = hashLabel(label)
  // Комбинация двух 32-битных значений с последующим перемешиванием
  let s = (baseSeed ^ h) >>> 0
  s = Math.imul(s ^ (s >>> 15), 0x85ebca6b) >>> 0
  s ^= s >>> 13
  s = Math.imul(s, 0xc2b2ae35) >>> 0
  s ^= s >>> 16
  return s >>> 0
}

/**
 * Создать генератор случайных чисел [0..1) из baseSeed и label.
 * Каждый label формирует независимый детерминированный поток.
 */
export function deriveRng(baseSeed: number, label: number | string): () => number {
  return mulberry32(splitSeed(baseSeed, label))
}

/**
 * Выбрать случайное число из диапазона [min, max] с равномерным распределением.
 * @param rng — генератор [0..1)
 * @param min — минимум (включительно)
 * @param max — максимум (включительно)
 */
export function randRange(rng: () => number, min: number, max: number): number {
  if (min > max) [min, max] = [max, min]
  return min + (max - min) * rng()
}

/**
 * Выбрать случайное целое из диапазона [min, max] включительно.
 */
export function randIntRange(rng: () => number, min: number, max: number): number {
  if (min > max) [min, max] = [max, min]
  return Math.floor(randRange(rng, min, max + 1 - Number.EPSILON))
}

/**
 * Унифицирует выбор параметра, который может быть числом или диапазоном.
 * Если передано число — возвращает его. Если кортеж [min,max] — берёт случайное из диапазона.
 */
export function pickFromNumberOrRange(rng: () => number, v: number | [number, number]): number {
  return Array.isArray(v) ? randRange(rng, v[0], v[1]) : v
}

/**
 * Возвращает случайный угол в радианах из диапазона [min, max] (или полный круг, если не задано).
 */
export function randAngle(rng: () => number, range?: [number, number]): number {
  if (!range) return randRange(rng, -Math.PI, Math.PI)
  return randRange(rng, range[0], range[1])
}

/**
 * Сгенерировать случайный 32-битный seed.
 * Возвращает беззнаковое целое в диапазоне [0..2^32-1].
 * Используется как автоматический сид, если он не указан в спецификации.
 */
export function generateRandomSeed(): number {
  // Используем два вызова Math.random для лучшего распределения и Date.now как соль
  const a = (Math.random() * 0xffffffff) >>> 0
  const b = (Math.random() * 0xffffffff) >>> 0
  const mix = ((a ^ (b << 1)) + (Date.now() & 0xffffffff)) >>> 0
  return mix >>> 0
}
