import { describe, it, expect, vi } from 'vitest'
import { createGfxHeightSampler } from './GfxHeightSampler'
import type { GfxTerrainConfig } from '@/entities/terrain'
import { setCachedHeightsField, invalidate, getCachedHeightsField } from './assets/heightmapCache'

/**
 * Тесты GfxHeightSampler: готовность источника, работа с кэшем и стабильность нормалей.
 */
describe('GfxHeightSampler', () => {
  it('Perlin источник: isReady=true и ready() мгновенно', async () => {
    const cfg: GfxTerrainConfig = {
      worldWidth: 10,
      worldDepth: 10,
      source: { kind: 'perlin', params: { seed: 42, octaveCount: 2, amplitude: 0.1, persistence: 0.5, width: 16, height: 16 } }
    }
    const sampler = createGfxHeightSampler(cfg)
    expect(sampler.isReady?.()).toBe(true)
    await sampler.ready?.()
  })

  it('Heightmap источник: при наличии кэша heightsField готов сразу', async () => {
    const assetId = 'asset-test-1'
    setCachedHeightsField(assetId, { heights: new Float32Array([0, 1, 0, 1]), width: 2, height: 2 })

    const cfg: GfxTerrainConfig = {
      worldWidth: 2,
      worldDepth: 2,
      source: { kind: 'heightmap', params: { assetId, imgWidth: 2, imgHeight: 2, min: 0, max: 1, wrap: 'clamp' } }
    }
    const sampler = createGfxHeightSampler(cfg)
    expect(sampler.isReady?.()).toBe(true)
    await sampler.ready?.()

    // Проверяем, что высота в центре между 0 и 1 (интерполяция)
    const h = sampler.getHeight(0, 0)
    expect(h).toBeGreaterThanOrEqual(0)
    expect(h).toBeLessThanOrEqual(1)
  })

  it('Heightmap источник: invalidate очищает кэш и влияет на готовность новых экземпляров', () => {
    const assetId = 'asset-test-2'
    setCachedHeightsField(assetId, { heights: new Float32Array([0, 0, 0, 0]), width: 2, height: 2 })
    expect(getCachedHeightsField(assetId)).toBeDefined()
    invalidate(assetId)
    expect(getCachedHeightsField(assetId)).toBeUndefined()

    const cfg: GfxTerrainConfig = {
      worldWidth: 2,
      worldDepth: 2,
      source: { kind: 'heightmap', params: { assetId, imgWidth: 2, imgHeight: 2, min: 0, max: 1 } }
    }
    const sampler = createGfxHeightSampler(cfg)
    // Без кэша источник еще не готов (пока не произойдёт загрузка)
    expect(sampler.isReady?.()).toBe(false)
  })

  it('Нормали стабильны на плоской поверхности (ныне y=0)', () => {
    const assetId = 'asset-test-3'
    setCachedHeightsField(assetId, { heights: new Float32Array([0, 0, 0, 0]), width: 2, height: 2 })
    const cfg: GfxTerrainConfig = {
      worldWidth: 2,
      worldDepth: 2,
      source: { kind: 'heightmap', params: { assetId, imgWidth: 2, imgHeight: 2, min: 0, max: 0 } } // плоская
    }
    const sampler = createGfxHeightSampler(cfg)
    const n = sampler.getNormal(0, 0)
    expect(n[0]).toBeCloseTo(0, 6)
    expect(n[1]).toBeCloseTo(1, 6)
    expect(n[2]).toBeCloseTo(0, 6)
  })
})
