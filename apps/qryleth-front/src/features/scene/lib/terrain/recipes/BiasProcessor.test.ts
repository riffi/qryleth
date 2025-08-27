import { describe, it, expect } from 'vitest'
import type { GfxBiasSpec, GfxHeightSampler, GfxTerrainOp } from '@/entities/terrain'
import { computeBiasWeight, processBias } from './BiasProcessor'

function makeOp(id: string, x: number, z: number, r = 5): GfxTerrainOp {
  return { id, mode: 'add', center: [x, z], radius: r, intensity: 1, falloff: 'smoothstep', radiusZ: r }
}

describe('BiasProcessor', () => {
  const sampler: GfxHeightSampler = {
    getHeight: (x, z) => x + z,
    getNormal: () => [0, 1, 0],
  }

  it('preferHeight повышает вес подходящих точек', () => {
    const bias: GfxBiasSpec = { preferHeight: { min: 0, max: 1, weight: 0.9 } }
    const a = makeOp('a', 0.1, 0.2) // h≈0.3 → в диапазоне
    const b = makeOp('b', 10, 10)   // h≈20 → вне диапазона
    const wa = computeBiasWeight(a, bias, sampler)
    const wb = computeBiasWeight(b, bias, sampler)
    expect(wa).toBeGreaterThan(wb)
  })

  it('avoidOverlap устраняет пересекающиеся кандидаты', () => {
    const bias: GfxBiasSpec = { avoidOverlap: true }
    const c1 = makeOp('c1', 0, 0, 10)
    const c2 = makeOp('c2', 5, 0, 10) // пересекается с c1
    const c3 = makeOp('c3', 30, 0, 5) // отдельно
    const result = processBias([c1, c2, c3], bias, sampler)
    expect(result.find(o => o.id === 'c1') || result.find(o => o.id === 'c2')).toBeTruthy()
    expect(result.find(o => o.id === 'c3')).toBeTruthy()
    // Должен быть исключён один из пары пересекающихся
    expect(result.length).toBe(2)
  })
})

