import { describe, it, expect } from 'vitest'
import { decideSegments, buildGfxTerrainGeometry } from './GeometryBuilder'
import type { GfxHeightSampler, GfxTerrainConfig } from '@/entities/terrain'

/**
 * Вспомогательный сэмплер для тестов: плоская поверхность Y=0.
 */
const flatSampler: GfxHeightSampler = {
  getHeight: () => 0,
  getNormal: () => [0, 1, 0],
  isReady: () => true,
  ready: async () => {},
  dispose: () => {}
}

describe('GeometryBuilder', () => {
  it('decideSegments: heightmap → учитывает (imgWidth-1, imgHeight-1) с ограничениями', () => {
    const cfg: GfxTerrainConfig = {
      worldWidth: 10,
      worldHeight: 10,
      source: { kind: 'heightmap', params: { assetId: 'a', imgWidth: 33, imgHeight: 17, min: 0, max: 1 } }
    }
    const s = decideSegments(cfg)
    // min((33-1),(17-1)) = min(32,16) = 16, но не ниже 10
    expect(s).toBe(16)
  })

  it('decideSegments: perlin → учитывает (width-1, height-1) с нижней границей 10', () => {
    const cfg: GfxTerrainConfig = {
      worldWidth: 10,
      worldHeight: 10,
      source: { kind: 'perlin', params: { seed: 1, octaveCount: 1, amplitude: 1, persistence: 0.5, width: 8, height: 8 } }
    }
    const s = decideSegments(cfg)
    // min((8-1),(8-1)) = 7, но нижняя граница 10
    expect(s).toBe(10)
  })

  it('buildGfxTerrainGeometry: создаёт плоскость нужного размера', () => {
    const cfg: GfxTerrainConfig = {
      worldWidth: 20,
      worldHeight: 10,
      source: { kind: 'perlin', params: { seed: 1, octaveCount: 1, amplitude: 0, persistence: 0.5, width: 10, height: 10 } }
    }
    const geom = buildGfxTerrainGeometry(cfg, flatSampler)
    // Проверяем габариты boundingBox
    const bb = geom.boundingBox!
    expect(bb.min.x).toBeCloseTo(-cfg.worldWidth / 2, 6)
    expect(bb.max.x).toBeCloseTo(cfg.worldWidth / 2, 6)
    expect(bb.min.z).toBeCloseTo(-cfg.worldHeight / 2, 6)
    expect(bb.max.z).toBeCloseTo(cfg.worldHeight / 2, 6)
  })
})

