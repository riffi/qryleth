import type { GfxBiome, GfxBiomeScatteringConfig, GfxBiomeSourceFilter } from '@/entities/biome'
import { estimateTargetCount, sampleRandomPoints } from './RandomSampling'
import { samplePoissonDisk } from './PoissonDiskSampler'
import { createRng, xfnv1a } from '@/shared/lib/utils/prng'

/**
 * Тип источника для скаттеринга, соответствующий записи в библиотеке.
 * Минимально необходим для отбора по тегам и выбора UUID записи.
 */
export interface LibrarySourceItem {
  /** UUID записи в библиотеке */
  libraryUuid: string
  /** Теги записи (lowercase), для фильтрации и взвешивания */
  tags: string[]
}

/**
 * Результат скаттеринга: позиции/повороты/масштаб и выбранный источник для каждого инстанса.
 * Высота Y не задаётся (оставлена 0) — она может устанавливаться отдельной процедурой (террейн).
 */
export interface BiomePlacement {
  position: [number, number, number]
  rotationYDeg: number
  uniformScale: number
  libraryUuid: string
}

/**
 * Выполняет скаттеринг по биому, возвращая чистый массив размещений.
 *
 * Функция не модифицирует состояние сцены. Для фактического создания инстансов
 * использовать sceneAPI на следующей фазе.
 *
 * @param biome — параметры биома (область, scattering, seed)
 * @param library — список доступных источников (объектов из библиотеки)
 * @returns массив размещений
 */
export function scatterBiomePure(biome: GfxBiome, library: LibrarySourceItem[]): BiomePlacement[] {
  const cfg = biome.scattering
  const filtered = filterSources(cfg, library)
  if (filtered.length === 0) return []

  // Если определены страты и правила — обрабатываем их, иначе используем плоский режим
  const strata = biome.strata?.filter(s => s && Array.isArray(s.rules) && s.rules.length > 0) ?? []
  if (strata.length === 0) {
    return scatterWithConfig(biome, cfg, filtered)
  }

  // Распределяем целевую плотность равномерно между всеми правилами всех страт (итерация 1)
  const totalRules = strata.reduce((sum, s) => sum + s.rules.length, 0)
  if (totalRules <= 0) return []

  const perRuleDensity = Math.max(0, cfg.densityPer100x100 / totalRules)
  const result: BiomePlacement[] = []
  for (let si = 0; si < strata.length; si++) {
    const stratum = strata[si]
    for (let ri = 0; ri < stratum.rules.length; ri++) {
      const rule = stratum.rules[ri] as any
      // Итерация 2: локальные параметры на уровне правила с детерминированным seed
      const localDensity = (rule?.densityPer100x100 ?? perRuleDensity) as number
      const localEdge = (rule?.edge ?? cfg.edge) as GfxBiomeScatteringConfig['edge']
      const localTransform = (rule?.transform ?? cfg.transform) as GfxBiomeScatteringConfig['transform']
      const baseSeed = (cfg.seed ?? 0).toString()
      const localSeed = xfnv1a(`${baseSeed}:${si}:${ri}`)
      const localCfg: GfxBiomeScatteringConfig = {
        ...cfg,
        densityPer100x100: localDensity,
        // Локальные переопределения алгоритма распределения и минимальной дистанции, если заданы в правиле
        distribution: (rule?.distribution ?? cfg.distribution) as GfxBiomeScatteringConfig['distribution'],
        minDistance: (rule?.minDistance ?? cfg.minDistance) as number | undefined,
        edge: localEdge,
        transform: localTransform,
        seed: localSeed,
      }
      // Локальный выбор источников на уровне правила, если задан
      const localFiltered = (rule && rule.sourceSelection)
        ? filterSourcesByFilter(rule.sourceSelection as GfxBiomeSourceFilter, library)
        : filtered
      if (localFiltered.length === 0) {
        // Если пул источников пуст — пропускаем данное правило
        continue
      }
      const placements = scatterWithConfig(biome, localCfg, localFiltered)
      result.push(...placements)
    }
  }
  return result
}

/**
 * Вспомогательная функция генерации размещений с заданной конфигурацией скаттеринга.
 * Используется как для плоского режима, так и для скелета стратификации.
 */
function scatterWithConfig(
  biome: GfxBiome,
  cfg: GfxBiomeScatteringConfig,
  filteredSources: Array<LibrarySourceItem & { weight: number }>,
): BiomePlacement[] {
  const target = estimateTargetCount(biome.area, cfg.densityPer100x100)
  if (target <= 0) return []

  const points = cfg.distribution === 'poisson'
    ? samplePoissonDisk(biome.area, cfg.minDistance ?? 1, target, cfg.seed, cfg.edge)
    : sampleRandomPoints(biome.area, cfg, cfg.seed)

  const result: BiomePlacement[] = []
  const rng = createRng(cfg.seed)
  for (const [x, z] of points) {
    const src = pickSourceWeighted(filteredSources, cfg, rng())
    const yaw = randomInRange(cfg.transform.randomYawDeg ?? [0, 360], rng())
    const scale = randomInRange(cfg.transform.randomUniformScale ?? [1, 1], rng())
    const off = cfg.transform.randomOffsetXZ ?? [0, 0]
    const ox = (off[0] === 0 && off[1] === 0) ? 0 : lerpSigned(off, rng())
    const oz = (off[0] === 0 && off[1] === 0) ? 0 : lerpSigned(off, rng())
    result.push({ position: [x + ox, 0, z + oz], rotationYDeg: yaw, uniformScale: scale, libraryUuid: src.libraryUuid })
  }
  return result
}

/**
 * Фильтрует источники по тегам/исключениям и расширяет их весами.
 * Веса из фильтра складываются: прямые веса по UUID и по тегам.
 */
function filterSources(cfg: GfxBiomeScatteringConfig, library: LibrarySourceItem[]): Array<LibrarySourceItem & { weight: number } > {
  return filterSourcesByFilter(cfg.sources, library)
}

/**
 * Применяет фильтр источников (теги/исключения/include/веса) к библиотеке и возвращает взвешенный список.
 * Используется как для глобального фильтра биома, так и для локального фильтра правила.
 */
function filterSourcesByFilter(filter: GfxBiomeSourceFilter, library: LibrarySourceItem[]): Array<LibrarySourceItem & { weight: number } > {
  const required = new Set((filter.requiredTags ?? []).map(t => t.toLowerCase()))
  const any = new Set((filter.anyTags ?? []).map(t => t.toLowerCase()))
  const exclude = new Set((filter.excludeTags ?? []).map(t => t.toLowerCase()))
  const includeUuids = new Set(filter.includeLibraryUuids ?? [])
  const wByUuid = filter.weightsByLibraryUuid ?? {}
  const wByTag = filter.weightsByTag ?? {}

  const res: Array<LibrarySourceItem & { weight: number }> = []
  for (const item of library) {
    if (includeUuids.size > 0 && !includeUuids.has(item.libraryUuid)) continue
    const tags = (item.tags || []).map(t => t.toLowerCase())
    if (exclude.size > 0 && tags.some(t => exclude.has(t))) continue
    if (required.size > 0 && ![...required].every(t => tags.includes(t))) continue
    if (any.size > 0 && !tags.some(t => any.has(t))) continue

    let weight = 1
    weight += wByUuid[item.libraryUuid] ?? 0
    for (const t of tags) weight += wByTag[t] ?? 0
    if (weight <= 0) continue
    res.push({ ...item, weight })
  }
  return res
}

/**
 * Выбор источника по весам.
 */
function pickSourceWeighted(items: Array<LibrarySourceItem & { weight: number }>, cfg: GfxBiomeScatteringConfig, r: number): LibrarySourceItem {
  const total = items.reduce((s, it) => s + it.weight, 0)
  let acc = 0
  const t = r * total
  for (const it of items) { acc += it.weight; if (t <= acc) return it }
  return items[items.length - 1]
}

function randomInRange([a, b]: [number, number], r: number): number {
  const min = Math.min(a, b)
  const max = Math.max(a, b)
  return min + (max - min) * r
}

function lerpSigned([min, max]: [number, number], r: number): number {
  // Случайное значение в [-max..-min]∪[min..max] для небольшого «дыхания»
  const sign = r < 0.5 ? -1 : 1
  const t = (r < 0.5 ? r * 2 : (r - 0.5) * 2)
  const v = min + (max - min) * t
  return sign * v
}
