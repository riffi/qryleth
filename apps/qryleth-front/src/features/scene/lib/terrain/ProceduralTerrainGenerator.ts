import type {
  GfxBiasSpec,
  GfxHeightSampler,
  GfxPlacementArea,
  GfxProceduralTerrainSpec,
  GfxTerrainConfig,
  GfxTerrainOp,
  GfxTerrainOpPool,
  GfxTerrainOpRecipe
} from '@/entities/terrain'
import { placePoints } from './placement'
import { deriveRng, randAngle, randIntRange } from './utils/PRNGUtils'
import { generateOpsForRecipeAtPoints } from './recipes/RecipeProcessor'
import { processBias } from './recipes/BiasProcessor'

/**
 * Основной движок процедурной генерации террейна.
 *
 * Класс объединяет алгоритмы размещения центров операций, шаблоны (recipes)
 * и bias‑фильтрацию в единый процесс генерации массива `GfxTerrainOp[]`, а
 * также умеет собирать полную конфигурацию `GfxTerrainConfig` по спецификации.
 */
export class ProceduralTerrainGenerator {
  /**
   * Сгенерировать массив операций террейна из пула рецептов.
   *
   * Алгоритм по шагам:
   * 1) Для каждого рецепта определяется количество (целое), размещаются центры с учётом области.
   * 2) При необходимости применяется «дрожание» центров (jitter.center, в метрах).
   * 3) Шаблон рецепта разворачивается в 1..N операций на точку (crater/terrace/ridge/valley).
   * 4) Применяется bias‑фильтрация (веса по высоте/уклону, избежание пересечений).
   * 5) Учитывается глобальный лимит `pool.global.maxOps`.
   *
   * Детерминированность обеспечивается разветвлением сидов на подпотоки через `deriveRng`.
   *
   * @param pool — пул рецептов генерации
   * @param seed — глобальный сид генерации
   * @param opts — параметры окружения
   *  - worldWidth/worldHeight: размеры мира (обязательны для размещения)
   *  - area: ограничение области размещения
   *  - sampler: сэмплер высот для bias‑фильтрации
   */
  async generateOpsFromPool(
    pool: GfxTerrainOpPool,
    seed: number,
    opts: { worldWidth: number; worldHeight: number; area?: GfxPlacementArea; sampler?: GfxHeightSampler }
  ): Promise<GfxTerrainOp[]> {
    const { worldWidth, worldHeight } = opts
    if (!worldWidth || !worldHeight) throw new Error('generateOpsFromPool: worldWidth/worldHeight обязательны')

    const intensityScale = pool.global?.intensityScale ?? 1
    const maxOps = pool.global?.maxOps ?? Infinity

    const allOps: GfxTerrainOp[] = []

    for (let rIdx = 0; rIdx < pool.recipes.length; rIdx++) {
      const recipe = pool.recipes[rIdx]
      if (!isFinite(maxOps) && allOps.length >= maxOps) break

      const countRng = deriveRng(seed, `recipe_${rIdx}_count`)
      const count = selectRecipeCount(recipe, countRng)

      const placeRng = deriveRng(seed, `recipe_${rIdx}_place`)
      const centers = placePoints(recipe.placement, count, placeRng, { worldWidth, worldHeight, area: opts.area })

      // Применяем jitter центра при необходимости
      const jittered: Array<[number, number]> = []
      for (let i = 0; i < centers.length; i++) {
        const c = centers[i]
        if (recipe.jitter?.center && recipe.jitter.center > 0) {
          const jrng = deriveRng(seed, `recipe_${rIdx}_jitter_${i}`)
          const ang = randAngle(jrng)
          const r = recipe.jitter.center * jrng()
          jittered.push([c.x + Math.cos(ang) * r, c.z + Math.sin(ang) * r])
        } else {
          jittered.push([c.x, c.z])
        }
      }

      // Разворачиваем шаблон в операции и применяем bias‑фильтрацию
      const candidates = generateOpsForRecipeAtPoints(recipe, jittered, seed, { intensityScale })
      const selected = applyBias(candidates, recipe.bias, opts.sampler, allOps)

      // Учитываем глобальный лимит операций
      if (selected.length > 0) {
        const remaining = Math.max(0, maxOps - allOps.length)
        allOps.push(...selected.slice(0, remaining))
      }
    }

    return allOps
  }

  /**
   * Сгенерировать полный `GfxTerrainConfig` по спецификации `GfxProceduralTerrainSpec`.
   *
   * Собирает источник Perlin по `spec.base`, переносит `world` и `edgeFade`,
   * генерирует операции из пула (`spec.pool`) с использованием `spec.seed`.
   *
   * @param spec — спецификация процедурной генерации
   * @returns конфигурация террейна, готовая к использованию в сэмплере/рендере
   */
  async generateTerrain(spec: GfxProceduralTerrainSpec): Promise<GfxTerrainConfig> {
    const worldWidth = spec.world.width
    const worldHeight = spec.world.height

    // Базовый источник — Perlin, переносим параметры 1:1 (offset игнорируется на этом уровне)
    const source: GfxTerrainConfig['source'] = {
      kind: 'perlin',
      params: {
        seed: spec.base.seed,
        octaveCount: spec.base.octaveCount,
        amplitude: spec.base.amplitude,
        persistence: spec.base.persistence,
        width: spec.base.width,
        height: spec.base.height
      }
    }

    const ops = await this.generateOpsFromPool(spec.pool, spec.seed, {
      worldWidth,
      worldHeight,
    })

    const config: GfxTerrainConfig = {
      worldWidth,
      worldHeight,
      edgeFade: spec.world.edgeFade,
      source,
      ops
    }
    return config
  }
}

/**
 * Вспомогательно: выбор количества инстансов для рецепта.
 * При диапазоне берём целое из [min..max]. При числе — округляем к ближайшему целому ≥ 0.
 */
function selectRecipeCount(recipe: GfxTerrainOpRecipe, rng: () => number): number {
  const c = recipe.count
  if (Array.isArray(c)) {
    const min = Math.floor(Math.max(0, c[0]))
    const max = Math.floor(Math.max(min, c[1]))
    return randIntRange(rng, min, max)
  }
  return Math.max(0, Math.round(c))
}

/**
 * Вспомогательно: применить bias‑фильтрацию с учётом существующих операций.
 */
function applyBias(
  candidates: GfxTerrainOp[],
  bias?: GfxBiasSpec,
  sampler?: GfxHeightSampler,
  existingOps?: GfxTerrainOp[],
): GfxTerrainOp[] {
  if (!bias) return candidates
  return processBias(candidates, bias, sampler, existingOps)
}

export default ProceduralTerrainGenerator
