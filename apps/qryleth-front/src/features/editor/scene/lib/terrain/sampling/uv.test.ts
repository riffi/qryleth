import { describe, it, expect } from 'vitest'
import { worldToUV, applyWrap } from './uv'

/**
 * Тесты преобразования мировых координат в UV и стратегий обрезки/повтора.
 */
describe('sampling/uv', () => {
  it('worldToUV: центр мира → (0.5, 0.5)', () => {
    const [u, v] = worldToUV(0, 0, 10, 20)
    expect(u).toBeCloseTo(0.5, 6)
    expect(v).toBeCloseTo(0.5, 6)
  })

  it('worldToUV: края мира корректны', () => {
    expect(worldToUV(-5, 0, 10, 20)[0]).toBeCloseTo(0, 6)
    expect(worldToUV(5, 0, 10, 20)[0]).toBeCloseTo(1, 6)
    expect(worldToUV(0, -10, 10, 20)[1]).toBeCloseTo(0, 6)
    expect(worldToUV(0, 10, 10, 20)[1]).toBeCloseTo(1, 6)
  })

  it('applyWrap: clamp ограничивает в [0..1]', () => {
    const [u, v] = applyWrap(-0.25, 1.25, 'clamp')
    expect(u).toBe(0)
    expect(v).toBe(1)
  })

  it('applyWrap: repeat возвращает дробную часть с учётом отрицательных', () => {
    const [u1] = applyWrap(-0.25, 0, 'repeat')
    expect(u1).toBeCloseTo(0.75, 6)
    const [u2] = applyWrap(1.25, 0, 'repeat')
    expect(u2).toBeCloseTo(0.25, 6)
  })
})

