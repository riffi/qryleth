import type { GfxBiome, GfxBiomeScatteringConfig, GfxBiomeSourceFilter } from '@/entities/biome'
import { sampleRandomPoints, estimateMaxCountBySpacing } from './RandomSampling'
import { samplePoissonDisk } from './PoissonDiskSampler'
import { createRng, xfnv1a } from '@/shared/lib/utils/prng'
import type { SurfaceContext } from './SurfaceMask'

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
  /**
   * Опциональные параметры автоповорота по нормали к поверхности.
   * Прокидываются из transform.alignToSurfaceNormal выбранной конфигурации
   * (глобальной или страты), чтобы на этапе применения к сцене можно было
   * корректно наклонить объект с учётом локальных переопределений.
   */
  alignToSurfaceNormal?: {
    maxDeviationDeg?: number
    curvatureInfluence?: number
  }
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
  // Прежняя сигнатура сохранена для обратной совместимости (без surface‑маски)
  return scatterBiomePureWithSurface(biome, library)
}

/**
 * Расширенная версия генерации размещений: поддерживает опциональный контекст поверхности.
 *
 * Если `surfaceCtx` не передан или в конфигурации биома/страт не задан `surface`,
 * функционал учёта рельефа полностью игнорируется (как в текущей реализации).
 *
 * @param biome — параметры биома (область, scattering, seed)
 * @param library — список доступных источников (объектов из библиотеки)
 * @param surfaceCtx — опциональный контекст поверхности (выбор сэмплера высот по x,z)
 * @returns массив размещений
 */
export function scatterBiomePureWithSurface(
  biome: GfxBiome,
  library: LibrarySourceItem[],
  surfaceCtx?: SurfaceContext
): BiomePlacement[] {
  const base = biome.scattering
  const filtered = filterSources(base, library)
  if (filtered.length === 0) return []

  // Если есть страты с частичным оверрайдом — обрабатываем их по очереди
  const strata = biome.strata ?? []
  if (strata.length === 0) return scatterWithConfig(biome, base, filtered, surfaceCtx)

  const result: BiomePlacement[] = []
  const baseSeed = (base.seed ?? 0).toString()
  for (let si = 0; si < strata.length; si++) {
    const s = strata[si]
    const localSeed = xfnv1a(`${baseSeed}:${si}`)
    const localCfg: GfxBiomeScatteringConfig = {
      ...base,
      ...(s.scattering ?? {}),
      seed: localSeed,
    }
    const placements = scatterWithConfig(biome, localCfg, filterSources(localCfg, library), surfaceCtx)
    if (placements.length > 0) result.push(...placements)
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
  surfaceCtx?: SurfaceContext,
): BiomePlacement[] {
  // Если после фильтрации не осталось источников — нечего размещать
  if (!filteredSources || filteredSources.length === 0) return []
  const useSurface = !!cfg.surface && !!surfaceCtx
  const points = cfg.algorithm === 'poisson'
    ? samplePoissonDisk(
        biome.area,
        cfg.spacing,
        estimateMaxCountBySpacing(biome.area, cfg.spacing),
        cfg.seed,
        cfg.edge,
        useSurface ? { surfaceMask: cfg.surface!, surfaceCtx: surfaceCtx! } : undefined
      )
    : sampleRandomPoints(
        biome.area,
        cfg,
        cfg.seed,
        undefined,
        useSurface ? { surfaceMask: cfg.surface!, surfaceCtx: surfaceCtx! } : undefined
      )

  const result: BiomePlacement[] = []
  const rng = createRng(cfg.seed)
  for (const [x, z] of points) {
    const src = pickSourceWeighted(filteredSources, cfg, rng())
    const yaw = randomInRange((cfg.transform?.randomYawDeg ?? [0, 360]) as [number, number], rng())
    const scale = randomInRange((cfg.transform?.randomUniformScale ?? [1, 1]) as [number, number], rng())
    const off = (cfg.transform?.randomOffsetXZ ?? [0, 0]) as [number, number]
    const ox = (off[0] === 0 && off[1] === 0) ? 0 : lerpSigned(off, rng())
    const oz = (off[0] === 0 && off[1] === 0) ? 0 : lerpSigned(off, rng())
    result.push({
      position: [x + ox, 0, z + oz],
      rotationYDeg: yaw,
      uniformScale: scale,
      libraryUuid: src.libraryUuid,
      alignToSurfaceNormal: cfg.transform?.alignToSurfaceNormal
    })
  }
  return result
}

/**
 * Фильтрует источники по тегам/исключениям и расширяет их весами.
 * Веса из фильтра складываются: прямые веса по UUID и по тегам.
 */
function filterSources(cfg: GfxBiomeScatteringConfig, library: LibrarySourceItem[]): Array<LibrarySourceItem & { weight: number } > {
  if (!cfg.source) return library.map(item => ({ ...item, weight: 1 }))
  return filterSourcesByFilter(cfg.source, library)
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
