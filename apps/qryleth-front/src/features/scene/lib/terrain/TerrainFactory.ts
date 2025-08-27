import type { GfxProceduralTerrainSpec, GfxTerrainConfig, GfxTerrainOpPool } from '@/entities/terrain'
import { ProceduralTerrainGenerator } from './ProceduralTerrainGenerator'

/**
 * Фабрики процедурных конфигураций террейна и готовых `GfxTerrainConfig`.
 *
 * Каждая фабрика использует устойчивые по умолчанию параметры мира и шума,
 * а также наборы рецептов (pool.recipes) для создания характерных ландшафтов.
 * Все функции детерминированы по входному seed.
 */

/**
 * Создаёт спецификацию для «горного» ландшафта.
 * @param seed — глобальный сид процедурной генерации (для пула операций)
 */
export function createMountainSpec(seed: number = 9876): GfxProceduralTerrainSpec {
  const world = { width: 300, height: 300, edgeFade: 0.1 }
  const base = { seed: seed ^ 0x5a5a, octaveCount: 6, amplitude: 12, persistence: 0.6, width: 128, height: 128 }
  const pool: GfxTerrainOpPool = {
    global: { intensityScale: 1.2, maxOps: 100 },
    recipes: [
      { kind: 'hill', count: [15, 25], placement: { type: 'poisson', minDistance: 25 }, radius: [12, 30], intensity: [8, 15], falloff: 'smoothstep' },
      { kind: 'ridge', count: 3, placement: { type: 'gridJitter', cell: 120, jitter: 0.35 }, radius: [8, 12], aspect: [0.2, 0.4], step: 10, intensity: [6, 10], falloff: 'smoothstep' }
    ]
  }
  return { world, base, pool, seed }
}

/**
 * Создаёт спецификацию для «холмистого» ландшафта (умеренный рельеф).
 * @param seed — глобальный сид
 */
export function createHillsSpec(seed: number = 2468): GfxProceduralTerrainSpec {
  const world = { width: 240, height: 240, edgeFade: 0.1 }
  const base = { seed: seed ^ 0x777, octaveCount: 5, amplitude: 8, persistence: 0.55, width: 96, height: 96 }
  const pool: GfxTerrainOpPool = {
    global: { intensityScale: 1.0, maxOps: 80 },
    recipes: [
      { kind: 'hill', count: [20, 30], placement: { type: 'uniform' }, radius: [10, 18], intensity: [4, 9], falloff: 'smoothstep' },
      { kind: 'plateau', count: [2, 4], placement: { type: 'poisson', minDistance: 50 }, radius: [12, 18], intensity: [2, 4], falloff: 'linear' }
    ]
  }
  return { world, base, pool, seed }
}

/**
 * Создаёт спецификацию для «песчаных дюн».
 * @param seed — глобальный сид
 */
export function createDunesSpec(seed: number = 7777): GfxProceduralTerrainSpec {
  const world = { width: 200, height: 200, edgeFade: 0.15 }
  const base = { seed: seed ^ 0xaaaa, octaveCount: 3, amplitude: 4, persistence: 0.4, width: 48, height: 48 }
  const pool: GfxTerrainOpPool = {
    recipes: [
      { kind: 'dune', count: [20, 30], placement: { type: 'gridJitter', cell: 16, jitter: 0.6 }, radius: [8, 14], aspect: [0.2, 0.5], rotation: [-0.3, 0.3], intensity: [1, 3], falloff: 'smoothstep' },
      { kind: 'basin', count: [3, 6], placement: { type: 'poisson', minDistance: 40 }, radius: [15, 25], intensity: [2, 4], bias: { preferHeight: { max: 2, weight: 0.8 } } }
    ]
  }
  return { world, base, pool, seed }
}

/**
 * Сгенерировать «горный» террейн (готовый `GfxTerrainConfig`).
 */
export async function createMountainTerrain(seed?: number): Promise<GfxTerrainConfig> {
  const gen = new ProceduralTerrainGenerator()
  return gen.generateTerrain(createMountainSpec(seed ?? 9876))
}

/**
 * Сгенерировать «холмистый» террейн.
 */
export async function createHillsTerrain(seed?: number): Promise<GfxTerrainConfig> {
  const gen = new ProceduralTerrainGenerator()
  return gen.generateTerrain(createHillsSpec(seed ?? 2468))
}

/**
 * Сгенерировать «дюнный» террейн.
 */
export async function createDunesTerrain(seed?: number): Promise<GfxTerrainConfig> {
  const gen = new ProceduralTerrainGenerator()
  return gen.generateTerrain(createDunesSpec(seed ?? 7777))
}

