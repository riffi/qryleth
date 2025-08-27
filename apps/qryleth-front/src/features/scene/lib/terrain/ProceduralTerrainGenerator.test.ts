import { describe, it, expect } from 'vitest'
import type { GfxProceduralTerrainSpec, GfxTerrainOpPool } from '@/entities/terrain'
import { ProceduralTerrainGenerator } from './ProceduralTerrainGenerator'
import { createGfxHeightSampler } from './GfxHeightSampler'

describe('ProceduralTerrainGenerator', () => {
  const world = { width: 100, height: 80, edgeFade: 0.1 }
  const base = { seed: 123, octaveCount: 3, amplitude: 5, persistence: 0.5, width: 32, height: 32 }

  it('generateOpsFromPool: детерминированность по seed', async () => {
    const pool: GfxTerrainOpPool = {
      recipes: [
        { kind: 'hill', count: 5, placement: { type: 'uniform' }, radius: [4, 6], intensity: [2, 3] }
      ]
    }
    const gen = new ProceduralTerrainGenerator()
    const ops1 = await gen.generateOpsFromPool(pool, 4242, { worldWidth: world.width, worldHeight: world.height })
    const ops2 = await gen.generateOpsFromPool(pool, 4242, { worldWidth: world.width, worldHeight: world.height })
    expect(ops1.length).toBe(ops2.length)
    for (let i = 0; i < ops1.length; i++) {
      expect(ops1[i].id).toEqual(ops2[i].id)
      expect(ops1[i].center).toEqual(ops2[i].center)
    }
  })

  it('generateOpsFromPool: учитывает maxOps', async () => {
    const pool: GfxTerrainOpPool = {
      global: { maxOps: 3 },
      recipes: [
        { kind: 'hill', count: 5, placement: { type: 'uniform' }, radius: 5, intensity: 2 },
        { kind: 'hill', count: 5, placement: { type: 'uniform' }, radius: 5, intensity: 2 }
      ]
    }
    const gen = new ProceduralTerrainGenerator()
    const ops = await gen.generateOpsFromPool(pool, 7, { worldWidth: world.width, worldHeight: world.height })
    expect(ops.length).toBeLessThanOrEqual(3)
  })

  it('generateTerrain: собирает корректную конфигурацию', async () => {
    const spec: GfxProceduralTerrainSpec = {
      world,
      base,
      pool: { recipes: [{ kind: 'hill', count: 2, placement: { type: 'uniform' }, radius: 6, intensity: 3 }] },
      seed: 999
    }
    const gen = new ProceduralTerrainGenerator()
    const cfg = await gen.generateTerrain(spec)
    expect(cfg.worldWidth).toBe(world.width)
    expect(cfg.worldHeight).toBe(world.height)
    expect(cfg.source.kind).toBe('perlin')
    expect(cfg.ops && cfg.ops.length).toBeGreaterThan(0)

    // База готова к семплингу
    const sampler = createGfxHeightSampler(cfg)
    expect(sampler.isReady && sampler.isReady()).toBe(true)
    const h = sampler.getHeight(0, 0)
    expect(Number.isFinite(h)).toBe(true)
  })
})

