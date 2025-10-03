/**
 * Простой детерминированный ГПСЧ (Mulberry32) для воспроизводимости.
 */
export class RNG {
  private seed: number

  /**
   * Создаёт генератор случайных чисел с целочисленным seed.
   * @param seed Начальное значение seed
   */
  constructor(seed = 0) {
    this.seed = (seed >>> 0) || 0
  }

  /**
   * Возвращает псевдослучайное число в диапазоне [0, 1).
   */
  next(): number {
    let t = (this.seed += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /**
   * Возвращает число в диапазоне [min, max).
   * @param max Верхняя граница (исключительно)
   * @param min Нижняя граница (включительно), по умолчанию 0
   */
  range(max = 1, min = 0): number {
    return min + (max - min) * this.next()
  }
}

