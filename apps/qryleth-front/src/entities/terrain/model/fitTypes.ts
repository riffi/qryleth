/**
 * Типы для Fit-хелперов процедурной генерации террейна.
 *
 * Хелперы призваны упростить задание сложных форм рельефа (долины, гряды),
 * возвращая готовые рецепты операций (GfxTerrainOpRecipe[]) и оценки бюджета,
 * вместо ручного подбора низкоуровневых параметров (step/radius/aspect/intensity).
 */

import type { GfxTerrainOpRecipe } from './proceduralTypes'

/**
 * Прямоугольная область на плоскости XZ в мировых координатах.
 * Используется как «рамка», в которую следует вписать долину/гряду.
 */
export interface FitRect {
  /** Левая граница по X (мировые единицы) */
  x: number
  /** Нижняя граница по Z (мировые единицы) */
  z: number
  /** Ширина области по X (мировые единицы) */
  width: number
  /** Глубина области по Z (мировые единицы) */
  depth: number
}

/**
 * Габариты мира террейна, необходимые для безопасной подгонки внутри границ.
 */
export interface WorldSize {
  /** Полная ширина мира по X (мировые единицы) */
  width: number
  /** Полная глубина мира по Z (мировые единицы) */
  depth: number
}

/**
 * Опции вписывания долины (ValleyFit) в заданный прямоугольник.
 *
 * - thickness: желаемая «толщина» долины по Z (в метрах, поперёк направления).
 * - depth | prominencePct: целевая глубина (в метрах) или доля от амплитуды базы перлина.
 * - direction: ориентация долины; auto — вдоль длинной стороны прямоугольника.
 * - continuity: сплошная штрих-линия (stroke) или сегментированная цепочка.
 * - variation: степень вариаций радиусов/интенсивностей внутри набора операций.
 * - edgeMargin: дополнительный отступ от краёв мира для защиты от edgeFade.
 * - budgetShare: желательная доля бюджета (0..1) для этого элемента при авто-распределении.
 * - randomRotationEnabled: включить случайный поворот, если диапазон rotation не задан явно.
 */
export interface ValleyFitOptions {
  thickness: number
  depth?: number
  prominencePct?: number
  direction?: 'auto' | 'x' | 'z' | number
  continuity?: 'continuous' | 'segmented'
  variation?: 'low' | 'mid' | 'high'
  edgeMargin?: number
  budgetShare?: number
  randomRotationEnabled?: boolean
}

/**
 * Опции вписывания гряды/хребта (RidgeBandFit) в заданный прямоугольник.
 * Параметры аналогичны ValleyFit, но вместо глубины — высота/выраженность.
 */
export interface RidgeBandFitOptions {
  thickness: number
  height?: number
  prominencePct?: number
  direction?: 'auto' | 'x' | 'z' | number
  continuity?: 'continuous' | 'segmented'
  variation?: 'low' | 'mid' | 'high'
  edgeMargin?: number
  budgetShare?: number
  randomRotationEnabled?: boolean
  /**
   * Расширенная ручная настройка параметров ridge‑рецепта.
   * Если указана, имеет приоритет над авто‑подбором в соответствующих полях.
   */
  pattern?: {
    /** Количество центров (для segmented) или диапазон */
    count?: number | [number, number]
    /** Радиус (или диапазон) вдоль главной оси штриха */
    radius?: number | [number, number]
    /** Диапазон отношения Rz/Rx для поперечной толщины */
    aspect?: [number, number]
    /** Интенсивность (или диапазон) */
    intensity?: number | [number, number]
    /** Шаг между эллипсами в штрихе (для ridge/valley со step>0) */
    step?: number
    /** Функция затухания краёв */
    falloff?: 'smoothstep' | 'gauss' | 'linear'
  }
}

/**
 * Результат работы Fit-хелпера: набор рецептов и служебные оценки.
 */
export interface FitResult {
  /** Сформированные рецепты операций для добавления в pool.recipes */
  recipes: GfxTerrainOpRecipe[]
  /** Оценка суммарного числа GfxTerrainOp, требуемых этими рецептами (для бюджета) */
  estimateOps: number
  /** Итоговая ориентация (радианы), если direction был 'auto' */
  orientation: number
  /** Предупреждения о возможных проблемах (узкая зона, край мира, edgeFade и т.п.) */
  warnings: string[]
}
