import { describe, it, expect } from 'vitest'
import { createDunesTerrain, createHillsTerrain, createMountainTerrain, createDunesSpec, createHillsSpec, createMountainSpec } from './TerrainFactory'
import { createGfxHeightSampler } from './GfxHeightSampler'

describe('TerrainFactory', () => {
  it('createMountainTerrain: генерирует валидную конфигурацию и детерминированна по seed', async () => {
    const cfg1 = await createMountainTerrain(1111)
    const cfg2 = await createMountainTerrain(1111)
    expect(cfg1.worldWidth).toBeGreaterThan(0)
    expect(cfg1.ops && cfg1.ops.length).toBeGreaterThan(0)
    expect(cfg1.worldWidth).toBe(cfg2.worldWidth)
    expect(cfg1.worldHeight).toBe(cfg2.worldHeight)
    expect(cfg1.ops!.map(o => o.id)).toEqual(cfg2.ops!.map(o => o.id))

    const sampler = createGfxHeightSampler(cfg1)
    expect(sampler.getHeight(0, 0)).toBeTypeOf('number')
  })

  it('createHillsTerrain / createDunesTerrain: корректные размеры и операции > 0', async () => {
    const hills = await createHillsTerrain(2222)
    expect(hills.worldWidth).toBeGreaterThan(0)
    expect(hills.ops && hills.ops.length).toBeGreaterThan(0)

    const dunes = await createDunesTerrain(3333)
    expect(dunes.worldWidth).toBeGreaterThan(0)
    expect(dunes.ops && dunes.ops.length).toBeGreaterThan(0)
  })

  it('create*Spec: возвращают спецификации с ожидаемыми полями', () => {
    const m = createMountainSpec(1)
    expect(m.world.width).toBeGreaterThan(0)
    expect(m.pool.recipes.length).toBeGreaterThan(0)
    const h = createHillsSpec(2)
    expect(h.base.octaveCount).toBeGreaterThan(0)
    const d = createDunesSpec(3)
    expect(d.base.width).toBeGreaterThan(0)
  })
})

