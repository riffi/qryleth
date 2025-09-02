import { describe, it, expect } from 'vitest'
import { SceneAPI } from './sceneAPI'
import type { GfxTerrainOpPool } from '@/entities/terrain'
import { createHillsSpec } from './terrain/TerrainFactory'

describe('SceneAPI: процедурная генерация террейна', () => {
  it('generateProceduralTerrain: возвращает валидный GfxTerrainConfig и детерминирован по seed', async () => {
    const spec = createHillsSpec(4242)
    const cfg1 = await SceneAPI.generateProceduralTerrain(spec)
    const cfg2 = await SceneAPI.generateProceduralTerrain(spec)

    expect(cfg1.worldWidth).toBe(spec.layer.width)
    expect(cfg1.worldDepth).toBe(spec.layer.height)
    expect(cfg1.ops && cfg1.ops.length).toBeGreaterThan(0)
    expect(cfg1.ops!.map(o => o.id)).toEqual(cfg2.ops!.map(o => o.id))
  })

  it('generateTerrainOpsFromPool: генерирует операции при явных размерах мира', async () => {
    const spec = createHillsSpec(1357)
    const ops = await SceneAPI.generateTerrainOpsFromPool(
      spec.pool as GfxTerrainOpPool,
      spec.seed,
      { worldWidth: spec.layer.width, worldDepth: spec.layer.depth }
    )
    expect(Array.isArray(ops)).toBe(true)
    expect(ops.length).toBeGreaterThan(0)
  })

  it('createProceduralLayer: создаёт слой и возвращает layerId', async () => {
    const spec = createHillsSpec(2468)
    const res = await SceneAPI.createProceduralLayer(spec, { name: 'PTG Test Layer', visible: true })
    expect(res.success).toBe(true)
    expect(typeof res.layerId).toBe('string')
  })
})
