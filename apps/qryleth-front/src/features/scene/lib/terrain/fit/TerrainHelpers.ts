import type {
  FitRect,
  WorldSize,
  ValleyFitOptions,
  RidgeBandFitOptions,
  FitResult
} from '@/entities/terrain'
import type { GfxTerrainOpRecipe } from '@/entities/terrain'

/**
 * TerrainHelpers — набор статических хелперов «вписывания» (fit) высокоуровневых
 * форм рельефа (долины/гряды) в заданные области сцены.
 *
 * ВАЖНО: Данный класс НЕ создаёт террейн и слои. Он возвращает только массивы
 * рецептов (GfxTerrainOpRecipe[]) и служебные оценки, которые затем можно
 * использовать в стандартном пайплайне SceneAPI (createProceduralLayer).
 */
export class TerrainHelpers {
  /**
   * Вписать долину (valley) в прямоугольник на плоскости XZ.
   * Выполняет расчёт ориентировки, шага/радиуса штриха, соотношения сторон (aspect)
   * и оценку бюджета операций. Возвращает только рецепты и оценки, без создания слоя.
   *
   * @param rect - целевой прямоугольник в мировых координатах (XZ)
   * @param options - параметры желаемой формы (толщина, глубина/выраженность и т.д.)
   * @param world - габариты мира (для защиты от выхода за пределы)
   * @param edgeFade - коэффициент затухания к краям мира (0..1), опционально
   */
  static valleyFitToRecipes(
    rect: FitRect,
    options: ValleyFitOptions,
    world: WorldSize,
    edgeFade?: number
  ): FitResult {
    const warnings: string[] = []

    // Определяем ориентацию
    const orientation = TerrainHelpers.resolveAutoDirection(rect, options.direction)

    // Геометрические характеристики
    const centerX = rect.x + rect.width / 2
    const centerZ = rect.z + rect.depth / 2
    const alongX = Math.abs(Math.cos(orientation)) >= Math.SQRT1_2 // ~ ближе к X
    const L = alongX ? rect.width : rect.depth // длина вдоль линии

    // Отступ от краёв прямоугольника/мира (защита от edgeFade и выходов)
    const worldEdgeMargin = (edgeFade ?? 0) * (alongX ? world.width : world.depth) * 0.5
    const rectMargin = Math.min(rect.width, rect.depth) * 0.05
    const margin = Math.max(options.edgeMargin ?? 0, rectMargin, worldEdgeMargin)

    // Базовые коэффициенты покрытия штриха для ridge/valley (5 центров)
    const overlapK = 0.7 // доля перекрытия: r ≈ k * step
    const effectiveHalf = Math.max(0, L / 2 - margin)
    const step = Math.max(1, Math.floor(0.95 * (effectiveHalf / (2 + overlapK))))
    let radius = Math.max(1, overlapK * step)

    // Толщина долины по Z
    const desiredThickness = options.thickness ?? Math.min(rect.depth, Math.max(10, L * 0.15))
    const radiusZ = Math.max(1, desiredThickness / 2)
    let aspect = TerrainHelpers.clamp(radiusZ / radius, 0.3, 2.0)

    // Если радиус слишком мал относительно толщины — подправим r в разумных пределах
    if (aspect > 2.0) {
      radius = TerrainHelpers.clamp(radiusZ / 2.0, 5, effectiveHalf / 2)
      aspect = TerrainHelpers.clamp(radiusZ / radius, 0.3, 2.0)
    }

    // Интенсивность (глубина долины), по метрам или эвристика
    let intensity = options.depth ?? (options.prominencePct != null ? 8 * options.prominencePct : 8)
    if (options.prominencePct != null && options.depth == null) {
      warnings.push('ValleyFit: intensity рассчитана эвристически по prominencePct (база=8)')
    }

    // Способ размещения: сплошной штрих или сегменты
    const recipes: GfxTerrainOpRecipe[] = []
    if ((options.continuity ?? 'continuous') === 'continuous') {
      // Один «штрих» из 5 эллипсов по step
      // Центр: середина rect; rotation — фиксированный угол
      const recipe: GfxTerrainOpRecipe = {
        kind: 'valley',
        mode: 'auto',
        count: 1,
        placement: { type: 'ring', center: [centerX, centerZ], rMin: 0, rMax: 0 },
        radius: Math.round(radius),
        aspect: [aspect, aspect],
        intensity: Math.abs(intensity),
        rotation: [orientation, orientation],
        step: Math.round(step),
        falloff: 'smoothstep',
        randomRotationEnabled: options.randomRotationEnabled
      }
      recipes.push(recipe)
    } else {
      // Сегментированная цепь: набор одиночных эллипсов внутри узкой полосы
      // Оцениваем требуемое число центров вдоль длины L
      const segOverlap = 0.5
      const per = Math.max(1, Math.round((2 * radius) * (1 - segOverlap)))
      const count = Math.max(3, Math.round(L / Math.max(1, per)))
      const recipe: GfxTerrainOpRecipe = {
        kind: 'valley',
        mode: 'auto',
        count,
        placement: { type: 'uniform', area: { kind: 'rect', x: rect.x, z: rect.z, width: rect.width, depth: rect.depth } },
        radius: Math.round(radius * 0.9),
        aspect: [aspect, aspect],
        intensity: Math.abs(intensity),
        rotation: [orientation, orientation],
        falloff: 'smoothstep',
        randomRotationEnabled: options.randomRotationEnabled
      }
      recipes.push(recipe)
    }

    // Итоговая оценка бюджета
    const estimateOps = TerrainHelpers.estimateOpsForRecipes(recipes)
    // Предупреждение, если штрих потенциально выходит за рамки прямоугольника
    if ((2 * step + radius) > effectiveHalf) {
      warnings.push('ValleyFit: крайние точки штриха близки к границам области — возможно, стоит уменьшить step или radius')
    }

    return { recipes, estimateOps, orientation, warnings }
  }

  /**
   * Вписать гряду/хребет (ridge) в прямоугольник на плоскости XZ.
   * При direction='auto' ориентирует гряду вдоль длинной стороны прямоугольника.
   * Возвращает только рецепты и оценки, без создания слоя.
   *
   * @param rect - целевой прямоугольник в мировых координатах (XZ)
   * @param options - параметры желаемой формы (толщина, высота/выраженность и т.д.)
   * @param world - габариты мира (для защиты от выхода за пределы)
   * @param edgeFade - коэффициент затухания к краям мира (0..1), опционально
   */
  static ridgeBandFitToRecipes(
    rect: FitRect,
    options: RidgeBandFitOptions,
    world: WorldSize,
    edgeFade?: number
  ): FitResult {
    const warnings: string[] = []
    const orientation = TerrainHelpers.resolveAutoDirection(rect, options.direction)

    const centerX = rect.x + rect.width / 2
    const centerZ = rect.z + rect.depth / 2
    const alongX = Math.abs(Math.cos(orientation)) >= Math.SQRT1_2
    const L = alongX ? rect.width : rect.depth

    const worldEdgeMargin = (edgeFade ?? 0) * (alongX ? world.width : world.depth) * 0.5
    const rectMargin = Math.min(rect.width, rect.depth) * 0.05
    const margin = Math.max(options.edgeMargin ?? 0, rectMargin, worldEdgeMargin)

    const overlapK = 0.7
    const effectiveHalf = Math.max(0, L / 2 - margin)
    const step = Math.max(1, Math.floor(0.95 * (effectiveHalf / (2 + overlapK))))
    let radius = Math.max(1, overlapK * step)

    const desiredThickness = options.thickness ?? Math.min(rect.depth, Math.max(10, L * 0.15))
    const radiusZ = Math.max(1, desiredThickness / 2)
    let aspect = TerrainHelpers.clamp(radiusZ / radius, 0.3, 2.0)
    if (aspect > 2.0) {
      radius = TerrainHelpers.clamp(radiusZ / 2.0, 5, effectiveHalf / 2)
      aspect = TerrainHelpers.clamp(radiusZ / radius, 0.3, 2.0)
    }

    let intensity = options.height ?? (options.prominencePct != null ? 10 * options.prominencePct : 10)
    if (options.prominencePct != null && options.height == null) {
      warnings.push('RidgeBandFit: intensity рассчитана эвристически по prominencePct (база=10)')
    }

    const recipes: GfxTerrainOpRecipe[] = []
    if ((options.continuity ?? 'continuous') === 'continuous') {
      const recipe: GfxTerrainOpRecipe = {
        kind: 'ridge',
        mode: 'auto',
        count: 1,
        placement: { type: 'ring', center: [centerX, centerZ], rMin: 0, rMax: 0 },
        radius: Math.round(radius),
        aspect: [aspect, aspect],
        intensity: Math.abs(intensity),
        rotation: [orientation, orientation],
        step: Math.round(step),
        falloff: 'smoothstep',
        randomRotationEnabled: options.randomRotationEnabled
      }
      recipes.push(recipe)
    } else {
      const segOverlap = 0.5
      const per = Math.max(1, Math.round((2 * radius) * (1 - segOverlap)))
      const count = Math.max(3, Math.round(L / Math.max(1, per)))
      const recipe: GfxTerrainOpRecipe = {
        kind: 'ridge',
        mode: 'auto',
        count,
        placement: { type: 'uniform', area: { kind: 'rect', x: rect.x, z: rect.z, width: rect.width, depth: rect.depth } },
        radius: Math.round(radius * 0.9),
        aspect: [aspect, aspect],
        intensity: Math.abs(intensity),
        rotation: [orientation, orientation],
        falloff: 'smoothstep',
        randomRotationEnabled: options.randomRotationEnabled
      }
      recipes.push(recipe)
    }

    const estimateOps = TerrainHelpers.estimateOpsForRecipes(recipes)
    if ((2 * step + radius) > effectiveHalf) {
      warnings.push('RidgeBandFit: крайние точки штриха близки к границам области — возможно, стоит уменьшить step или radius')
    }

    return { recipes, estimateOps, orientation, warnings }
  }

  /**
   * Оценить «стоимость» набора рецептов в количестве элементарных операций
   * (GfxTerrainOp) для планирования бюджета (pool.global.maxOps).
   *
   * Эвристика (простая консистентная оценка):
   * - ridge/valley с step>0 → 5 на центр, иначе 1
   * - crater → 2 на центр
   * - terrace → 4 на центр
   * - hill/basin/plateau/dune → 1 на центр
   * Для count:[min,max] берём среднее значение для оценки.
   *
   * @param recipes - набор рецептов
   * @returns оценка количества операций
   */
  static estimateOpsForRecipes(recipes: GfxTerrainOpRecipe[]): number {
    let total = 0
    for (const r of recipes) {
      const count = Array.isArray(r.count) ? (r.count[0] + r.count[1]) / 2 : r.count
      let perCenter = 1
      switch (r.kind) {
        case 'ridge':
        case 'valley':
          perCenter = r.step && r.step > 0 ? 5 : 1
          break
        case 'crater':
          perCenter = 2
          break
        case 'terrace':
          perCenter = 4
          break
        default:
          perCenter = 1
      }
      total += Math.max(0, count) * perCenter
    }
    return Math.ceil(total)
  }

  /**
   * Предложить значение глобального бюджета (pool.global.maxOps) для заданного
   * набора рецептов, с учётом запаса.
   *
   * @param recipes - набор рецептов
   * @param margin - доля запаса (по умолчанию 0.2 → +20%)
   * @returns рекомендованное значение maxOps
   */
  static suggestGlobalBudget(recipes: GfxTerrainOpRecipe[], margin: number = 0.2): number {
    const base = TerrainHelpers.estimateOpsForRecipes(recipes)
    return Math.ceil(base * (1 + Math.max(0, margin)))
  }

  /**
   * Автоматически подрезать набор рецептов под указанный бюджет maxOps.
   * См. комментарии к алгоритму приоритезации внутри метода.
   */
  static autoBudget(
    recipes: GfxTerrainOpRecipe[],
    maxOps: number
  ): { trimmedRecipes: GfxTerrainOpRecipe[]; usedOps: number; report: Array<{ index: number; kind: GfxTerrainOpRecipe['kind']; from: number; to: number; savedOps: number }> } {
    type Work = {
      index: number
      recipe: GfxTerrainOpRecipe
      count: number
      opsPerCenter: number
      priority: number
      minCount: number
    }

    const work: Work[] = recipes.map((r, idx) => {
      const count = Array.isArray(r.count) ? Math.round((r.count[0] + r.count[1]) / 2) : (r.count as number)
      const opsPerCenter = TerrainHelpers.opsPerCenter(r)
      const priority = TerrainHelpers.trimPriority(r)
      const minCount = r.kind === 'valley' ? 1 : (r.kind === 'ridge' ? 0 : 0)
      return { index: idx, recipe: r, count: Math.max(0, count), opsPerCenter, priority, minCount }
    })

    let usedOps = work.reduce((acc, w) => acc + w.count * w.opsPerCenter, 0)
    if (usedOps <= maxOps) {
      const trimmedRecipes = work.filter(w => w.count > 0).map(w => ({ ...w.recipe, count: w.count }))
      return { trimmedRecipes, usedOps, report: [] }
    }

    const report: Array<{ index: number; kind: GfxTerrainOpRecipe['kind']; from: number; to: number; savedOps: number }> = []

    const order = [...work].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      const costA = a.count * a.opsPerCenter
      const costB = b.count * b.opsPerCenter
      return costB - costA
    })

    let i = 0
    while (usedOps > maxOps && i < order.length) {
      const w = order[i]
      if (w.count > w.minCount) {
        const before = w.count
        w.count -= 1
        usedOps -= w.opsPerCenter
        report.push({ index: w.index, kind: w.recipe.kind, from: before, to: w.count, savedOps: w.opsPerCenter })
        i = 0
        continue
      }
      i++
    }

    const trimmedRecipes = work.filter(w => w.count > 0).map(w => ({ ...w.recipe, count: w.count }))
    return { trimmedRecipes, usedOps: Math.max(0, usedOps), report }
  }

  /** Оценка количества операций на один центр по типу рецепта */
  private static opsPerCenter(r: GfxTerrainOpRecipe): number {
    switch (r.kind) {
      case 'ridge':
      case 'valley':
        return r.step && r.step > 0 ? 5 : 1
      case 'crater':
        return 2
      case 'terrace':
        return 4
      default:
        return 1
    }
  }

  /** Приоритет подрезки: меньше — режем раньше */
  private static trimPriority(r: GfxTerrainOpRecipe): number {
    if (r.kind === 'valley') return 3 // структурная форма — сохраняем до последнего
    if (r.kind === 'ridge') return 2   // бордюры — средний приоритет
    return 1                            // детализация — режем в первую очередь
  }

  /**
   * Вычислить ориентацию для direction='auto': вдоль длинной стороны прямоугольника.
   * При равенстве сторон — вдоль оси X (0 радиан). Если direction задаётся числом,
   * возвращаем его как есть.
   */
  private static resolveAutoDirection(rect: FitRect, direction?: RidgeBandFitOptions['direction']): number {
    if (typeof direction === 'number') return direction
    if (direction === 'x') return 0
    if (direction === 'z') return Math.PI / 2
    // auto или undefined
    return rect.width >= rect.depth ? 0 : Math.PI / 2
  }

  /** Ограничить значение в пределах [min..max] */
  private static clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v))
  }
}
