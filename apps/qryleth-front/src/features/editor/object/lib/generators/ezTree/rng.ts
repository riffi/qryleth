/**
 * Простой детерминированный ГПСЧ (Mulberry32) для воспроизводимости.
 */
// Полная копия RNG из ez-tree (комбинированный LCG: m_w/m_z)
export class RNG {
  private m_w = 123456789
  private m_z = 987654321
  private mask = 0xffffffff

  constructor(seed: number) {
    this.m_w = (123456789 + (seed | 0)) & this.mask
    this.m_z = (987654321 - (seed | 0)) & this.mask
  }

  /**
   * Возвращает случайное число из [min, max).
   * Метод повторяет поведение исходного ez-tree RNG (комбинированный LCG).
   * Используется для детерминированной генерации при заданном seed.
   */
  random(max = 1, min = 0): number {
    this.m_z = (36969 * (this.m_z & 65535) + (this.m_z >>> 16)) & this.mask
    this.m_w = (18000 * (this.m_w & 65535) + (this.m_w >>> 16)) & this.mask
    let result = ((this.m_z << 16) + (this.m_w & 65535)) >>> 0
    result /= 4294967296
    return (max - min) * result + min
  }

  /**
   * Возвращает число в [min, max).
   * Синоним `random` для обратной совместимости с существующим кодом.
   */
  range(max = 1, min = 0): number { return this.random(max, min) }

  /**
   * Возвращает следующее псевдослучайное число из диапазона [0, 1).
   * Добавлено для совместимости с вызовами `this.rng.next()` в tree.ts.
   * Эквивалентно `random(1, 0)`.
   */
  next(): number { return this.random(1, 0) }
}
