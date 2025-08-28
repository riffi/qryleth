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
import { areaToWorldRect } from './placement/PlacementUtils'
import { deriveRng, randAngle, randIntRange, generateRandomSeed, splitSeed } from './utils/PRNGUtils'
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
   * Валидация рецепта перед генерацией точек и операций.
   * Бросает понятные ошибки при неподдерживаемых значениях.
   */
  private validateRecipe(recipe: GfxTerrainOpRecipe, index: number) {
    const ctx = `recipe[${index}]`
    const allowedKinds = ['hill','basin','ridge','valley','crater','plateau','terrace','dune']
    if (!allowedKinds.includes((recipe as any).kind)) {
      throw new Error(`${ctx}: неподдерживаемый kind='${(recipe as any)?.kind}'. Ожидалось: ${allowedKinds.join(', ')}`)
    }

    if (recipe.falloff && !['smoothstep','gauss','linear','plateau'].includes(recipe.falloff as any)) {
      throw new Error(`${ctx}: неподдерживаемый falloff='${(recipe as any)?.falloff}'. Ожидалось: smoothstep | gauss | linear | plateau`)
    }
    // coverArea поддерживается только для plateau/valley и прямоугольной области
    if ((recipe as any).coverArea) {
      const k = (recipe as any).kind
      const p: any = recipe.placement
      if (!(k === 'plateau' || k === 'valley')) {
        throw new Error(`${ctx}: coverArea поддерживается только для kind: plateau | valley`)
      }
      if (!p?.area || p.area.kind !== 'rect') {
        throw new Error(`${ctx}: coverArea требует placement.area прямоугольника { kind: 'rect', ... }`)
      }
    }
    // Валидация параметра flatInner для plateau
    if ((recipe as any).flatInner != null) {
      const fi = (recipe as any).flatInner
      if (typeof fi !== 'number' || !(fi >= 0 && fi <= 1)) {
        throw new Error(`${ctx}: flatInner должен быть числом в диапазоне [0..1]`)
      }
    }

    // Валидация placement по типу
    const p: any = recipe.placement
    const allowedPlacements = ['uniform','poisson','gridJitter','ring']
    if (!p || !allowedPlacements.includes(p.type)) {
      throw new Error(`${ctx}: неподдерживаемый placement.type='${p?.type}'. Ожидалось: ${allowedPlacements.join(', ')}`)
    }
    if (p.type === 'poisson') {
      if (typeof p.minDistance !== 'number' || !(p.minDistance >= 0)) {
        throw new Error(`${ctx}: placement.poisson требует числовой minDistance ≥ 0`)
      }
    } else if (p.type === 'gridJitter') {
      if (typeof p.cell !== 'number' || !(p.cell > 0)) {
        throw new Error(`${ctx}: placement.gridJitter требует положительный cell > 0`)
      }
      if (p.jitter != null && typeof p.jitter !== 'number') {
        throw new Error(`${ctx}: placement.gridJitter.jitter должен быть числом (0..1)`)
      }
    } else if (p.type === 'ring') {
      const c = p.center
      const okCenter = Array.isArray(c) && c.length === 2 && c.every((v: any) => typeof v === 'number')
      if (!okCenter) {
        throw new Error(`${ctx}: placement.ring.center должен быть массивом двух чисел [x, z]`)
      }
      if (typeof p.rMin !== 'number' || typeof p.rMax !== 'number' || !(p.rMax >= p.rMin) || !(p.rMin >= 0)) {
        throw new Error(`${ctx}: placement.ring rMin/rMax должны быть числами, rMax ≥ rMin, rMin ≥ 0`)
      }
    }

    // Валидация bias: только поддерживаемые ключи
    if (recipe.bias && typeof recipe.bias === 'object') {
      const keys = Object.keys(recipe.bias as any)
      const allowedBias = ['preferHeight','preferSlope','avoidOverlap']
      const unknown = keys.filter(k => !allowedBias.includes(k))
      if (unknown.length) {
        throw new Error(`${ctx}: bias содержит неподдерживаемые поля: ${unknown.join(', ')}. Ожидались: ${allowedBias.join(', ')}`)
      }
      const ph: any = (recipe.bias as any).preferHeight
      if (ph) {
        if (ph.weight != null && !(ph.weight >= 0 && ph.weight <= 1)) {
          throw new Error(`${ctx}: bias.preferHeight.weight должен быть в диапазоне [0..1]`)
        }
        if (ph.min != null && ph.max != null && !(ph.max >= ph.min)) {
          throw new Error(`${ctx}: bias.preferHeight.max должен быть ≥ min`)
        }
      }
      const ps: any = (recipe.bias as any).preferSlope
      if (ps) {
        if (ps.weight != null && !(ps.weight >= 0 && ps.weight <= 1)) {
          throw new Error(`${ctx}: bias.preferSlope.weight должен быть в диапазоне [0..1]`)
        }
        if (ps.min != null && ps.max != null && !(ps.max >= ps.min)) {
          throw new Error(`${ctx}: bias.preferSlope.max должен быть ≥ min`)
        }
      }
    }
  }
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
   *  - worldWidth/worldDepth: размеры мира (обязательны для размещения). Для совместимости
   *    допускается передача worldHeight, но рекомендуется использовать worldDepth.
   *  - area: ограничение области размещения
   *  - sampler: сэмплер высот для bias‑фильтрации
   */
  async generateOpsFromPool(
    pool: GfxTerrainOpPool,
    seed: number,
    opts: { worldWidth: number; worldDepth?: number; worldHeight?: number; area?: GfxPlacementArea; sampler?: GfxHeightSampler }
  ): Promise<GfxTerrainOp[]> {
    const worldWidth = opts.worldWidth
    const worldDepth = (opts as any).worldDepth ?? (opts as any).worldHeight
    if (!worldWidth || !worldDepth) throw new Error('generateOpsFromPool: worldWidth/worldDepth обязательны')

    const intensityScale = pool.global?.intensityScale ?? 1
    const maxOps = pool.global?.maxOps ?? Infinity

    const allOps: GfxTerrainOp[] = []

    for (let rIdx = 0; rIdx < pool.recipes.length; rIdx++) {
      const recipe = pool.recipes[rIdx]
      // Валидация рецепта перед обработкой
      this.validateRecipe(recipe, rIdx)
      if (!isFinite(maxOps) && allOps.length >= maxOps) break

      // Специальный режим: coverArea для plateau/valley с прямоугольной областью
      const pAny: any = recipe.placement
      const coverArea = (recipe as any).coverArea === true
      const kind = (recipe as any).kind
      if (coverArea && pAny?.area && pAny.area.kind === 'rect' && (kind === 'plateau' || kind === 'valley')) {
        const rect = areaToWorldRect(worldWidth, worldDepth, pAny.area)
        const cx = (rect.minX + rect.maxX) / 2
        const cz = (rect.minZ + rect.maxZ) / 2
        const rx = (rect.maxX - rect.minX) / 2
        const rz = (rect.maxZ - rect.minZ) / 2
        const falloff = (recipe.falloff as any) || 'plateau'
        const flatInner = (recipe as any).flatInner ?? 0.7
        const mode = (recipe.mode && recipe.mode !== 'auto') ? recipe.mode : (kind === 'valley' ? 'sub' : 'set')
        const intensityVal = Array.isArray(recipe.intensity)
          ? (recipe.intensity[0] + recipe.intensity[1]) / 2
          : recipe.intensity
        const intensity = Math.abs(intensityVal) * intensityScale
        allOps.push({
          id: `op_${rIdx.toString(36)}_${allOps.length.toString(36)}`,
          mode,
          shape: 'rect',
          center: [cx, cz],
          radius: rx,
          radiusZ: rz,
          intensity,
          falloff: falloff as any,
          flatInner,
          rotation: 0,
        })
        if (!isFinite(maxOps) || allOps.length < maxOps) {
          continue
        } else {
          break
        }
      }

      const countRng = deriveRng(seed, `recipe_${rIdx}_count`)
      const count = selectRecipeCount(recipe, countRng)

      const placeRng = deriveRng(seed, `recipe_${rIdx}_place`)
      const centers = placePoints(recipe.placement, count, placeRng, { worldWidth, worldDepth, area: recipe.placement.area })

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
    const worldDepth = (spec.world as any).depth ?? (spec.world as any).height

    // Автогенерация сидов: если общий seed или base.seed не заданы, генерируем их.
    // Логика:
    // - overallSeed: spec.seed или случайный, если не указан
    // - baseSeed: spec.base.seed или детерминированное разветвление от overallSeed
    const overallSeed = (spec as any).seed ?? generateRandomSeed()
    const baseSeed = (spec.base as any).seed ?? splitSeed(overallSeed, 'perlin_base')

    // Базовый источник — Perlin, переносим параметры; сид берём из baseSeed
    const source: GfxTerrainConfig['source'] = {
      kind: 'perlin',
      params: {
        seed: baseSeed,
        octaveCount: spec.base.octaveCount,
        amplitude: spec.base.amplitude,
        persistence: spec.base.persistence,
        width: spec.base.width,
        height: spec.base.height,
        // DC-смещение базового уровня (если указано в спецификации)
        heightOffset: spec.base.heightOffset
      }
    }

    const ops = await this.generateOpsFromPool(spec.pool, overallSeed, {
      worldWidth,
      worldDepth,
    })

    const config: GfxTerrainConfig = {
      worldWidth,
      worldHeight: worldDepth,
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
