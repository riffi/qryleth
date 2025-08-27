import { describe, it, expect } from 'vitest'
import { createRng } from '@/shared/lib/utils/prng'
import type { GfxTerrainOpRecipe } from '@/entities/terrain'
import { buildOpsForPoint } from './OperationTemplates'

describe('OperationTemplates', () => {
  it('hill: mode auto → add, одна операция', () => {
    const recipe: GfxTerrainOpRecipe = {
      kind: 'hill',
      mode: 'auto',
      count: 1,
      placement: { type: 'uniform' },
      radius: 10,
      intensity: 5,
    }
    const rng = createRng(123)
    const ops = buildOpsForPoint(recipe, [0, 0], rng)
    expect(ops.length).toBe(1)
    expect(ops[0].mode).toBe('add')
    expect(ops[0].radius).toBeCloseTo(10)
  })

  it('crater: генерирует яму (sub) и вал (add)', () => {
    const recipe: GfxTerrainOpRecipe = {
      kind: 'crater',
      mode: 'auto',
      count: 1,
      placement: { type: 'uniform' },
      radius: 20,
      intensity: 8,
      aspect: [0.8, 0.8],
    }
    const rng = createRng(999)
    const ops = buildOpsForPoint(recipe, [10, -5], rng)
    expect(ops.length).toBe(2)
    const modes = ops.map(o => o.mode).sort()
    expect(modes).toEqual(['add', 'sub'])
    const radii = ops.map(o => o.radius).sort((a,b)=>a-b)
    // внутренний радиус меньше внешнего
    expect(radii[0]).toBeLessThan(radii[1])
  })
})

