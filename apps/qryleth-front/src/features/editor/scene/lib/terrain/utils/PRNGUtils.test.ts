import { describe, it, expect } from 'vitest'
import { deriveRng, splitSeed, randRange, randIntRange, pickFromNumberOrRange } from './PRNGUtils'

describe('PRNGUtils', () => {
  it('deriveRng: детерминированность и независимость подпотоков', () => {
    const r1a = deriveRng(1234, 'a')
    const r1b = deriveRng(1234, 'a')
    const r2 = deriveRng(1234, 'b')
    expect(r1a()).toBeCloseTo(r1b(), 10)
    // разные лейблы → разные последовательности
    expect(Math.abs(r1a() - r2())).toBeGreaterThan(1e-6)
  })

  it('splitSeed: разные метки → разные сиды', () => {
    const s1 = splitSeed(42, 'x')
    const s2 = splitSeed(42, 'y')
    expect(s1).not.toEqual(s2)
  })

  it('randRange/randIntRange/pickFromNumberOrRange корректно выбирают значения', () => {
    const rng = deriveRng(777, 't')
    const a = randRange(rng, 0, 10)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThanOrEqual(10)

    const b = randIntRange(rng, 1, 3)
    expect(Number.isInteger(b)).toBe(true)
    expect(b).toBeGreaterThanOrEqual(1)
    expect(b).toBeLessThanOrEqual(3)

    const c1 = pickFromNumberOrRange(rng, 5)
    const c2 = pickFromNumberOrRange(rng, [2, 4])
    expect(c1).toBe(5)
    expect(c2).toBeGreaterThanOrEqual(2)
    expect(c2).toBeLessThanOrEqual(4)
  })
})

