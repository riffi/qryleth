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
    // Скелет реализации Фазы 1: возвращаем заглушку, чтобы не нарушать сборку.
    // Полная логика автоподбора будет реализована в следующих фазах.
    const recipes: GfxTerrainOpRecipe[] = []
    const estimateOps = 0
    const orientation = typeof options.direction === 'number' ? options.direction : 0
    const warnings: string[] = ['valleyFitToRecipes: логика автоподбора будет реализована в следующих фазах']
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
    const recipes: GfxTerrainOpRecipe[] = []
    const orientation = TerrainHelpers.resolveAutoDirection(rect, options.direction)
    const warnings: string[] = ['ridgeBandFitToRecipes: логика автоподбора будет реализована в следующих фазах']
    return { recipes, estimateOps: 0, orientation, warnings }
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
}

