import type { Point2, Rect2D, Circle2D, BoundRect2D } from '@/shared/types'
import type { GfxBiome, GfxBiomeArea, GfxBiomeRectArea, GfxBiomeCircleArea, GfxBiomePolygonArea, GfxBiomeEdgeFalloff } from '@/entities/biome'
import { clamp, smoothstep } from '@/shared/lib/math/number'
import {
  pointInsideRotatedRect,
  rotatedRectBounds,
  signedDistanceToRotatedRect,
  pointInsideCircle as geoPointInsideCircle,
  signedDistanceToCircle as geoSignedDistanceToCircle,
  circleToBounds,
  polygonBounds as geoPolygonBounds,
  pointInsidePolygon as geoPointInsidePolygon,
  signedDistanceToPolygon as geoSignedDistanceToPolygon,
  polygonArea as geoPolygonArea,
} from '@/shared/lib/math/geometry2d'

/**
 * Утилиты для работы с областями биома (плоскость XZ).
 *
 * Содержит функции:
 * - проверки попадания точки в область (pointInsideArea)
 * - расчёта границ (bounding box) области
 * - вычисления расстояния от точки до границы области (distanceToEdge)
 * - вычисления коэффициента затухания по краю (fadeWeight)
 * - оценки площади области (estimateArea)
 *
 * Все функции чистые, используют shared-типы и базовую математику из shared/lib.
 */

/**
 * Проверка попадания точки (x,z) в область биома.
 */
export function pointInsideArea(area: GfxBiomeArea, x: number, z: number): boolean {
  if (area.type === 'rect') return pointInsideRotatedRect(area.rect, area.rotationY ?? 0, x, z)
  if (area.type === 'circle') return geoPointInsideCircle(area.circle, x, z)
  return geoPointInsidePolygon(area.points, x, z)
}

/**
 * Возвращает ограничивающий прямоугольник BoundRect2D для области биома.
 */
export function getAreaBounds(area: GfxBiomeArea): BoundRect2D {
  if (area.type === 'rect') return rotatedRectBounds(area.rect, area.rotationY ?? 0)
  if (area.type === 'circle') return circleToBounds(area.circle)
  return geoPolygonBounds(area.points)
}

/**
 * Вычисляет расстояние от точки до ближайшей границы области (внутри области → >=0).
 * Если точка вне области — расстояние возвращается со знаком минус (отрицательное),
 * что удобно для принятия решений при отбраковке кандидатов.
 */
export function signedDistanceToEdge(area: GfxBiomeArea, x: number, z: number): number {
  if (area.type === 'rect') return signedDistanceToRotatedRect(area.rect, area.rotationY ?? 0, x, z)
  if (area.type === 'circle') return geoSignedDistanceToCircle(area.circle, x, z)
  return geoSignedDistanceToPolygon(area.points, x, z)
}

/**
 * Рассчитывает коэффициент затухания по краю (0..1) с учётом fadeWidth и профиля (linear/smoothstep).
 * Возвращаемое значение умножается на общий вес точки при выборке.
 */
export function fadeWeight(area: GfxBiomeArea, x: number, z: number, edge: GfxBiomeEdgeFalloff): number {
  const d = signedDistanceToEdge(area, x, z)
  if (edge.fadeWidth <= 0) return d >= 0 ? 1 : 0
  // Нормализуем расстояние до [0..1] внутри зоны затухания
  const t = clamp(d / edge.fadeWidth, 0, 1)
  if (edge.fadeCurve === 'linear' || !edge.fadeCurve) return t
  return smoothstep(t)
}

/**
 * Возвращает вес смещения вероятности к центру (+bias) или к краю (-bias).
 * Диапазон edgeBias: [-1..1]. Значение смешивается с fadeWeight на уровне оркестратора.
 *
 * Для положительных значений (к центру) используем (1 - e), где e — нормализованная близость к краю.
 * Для отрицательных — используем e.
 */
export function edgeBiasWeight(area: GfxBiomeArea, x: number, z: number, edge: GfxBiomeEdgeFalloff): number {
  // Сохраняем для обратной совместимости: возвращает вес «склонности» без учёта fade‑маски
  const d = signedDistanceToEdge(area, x, z)
  const fw = edge.fadeWidth > 0 ? clamp(d / edge.fadeWidth, 0, 1) : (d >= 0 ? 1 : 0)
  const e = 1 - fw // близость к краю: 1 у самой границы, 0 в глубине области
  const bias = clamp(edge.edgeBias ?? 0, -1, 1)
  if (bias === 0) return 1
  const affinity = bias > 0 ? (1 - e) : e
  return 1 * (1 - Math.abs(bias)) + affinity * Math.abs(bias)
}

/**
 * Итоговая вероятность принятия точки с учётом edge‑параметров (0..1).
 * Новая интерпретация силы bias:
 * - edgeBias = 0 → равномерное распределение (без эффекта края)
 * - edgeBias = 0.5 → наполовину выраженный fade у края
 * - edgeBias = 1 → полный fade у края
 * Отрицательные значения сохраняют поддержку и «смещают» к краю:
 * - edgeBias = -1 → сильное предпочтение у кромки
 */
export function edgeAcceptanceProbability(area: GfxBiomeArea, x: number, z: number, edge: GfxBiomeEdgeFalloff): number {
  // Требования:
  // - edgeBias = 0  → полностью равномерно (без эффекта края)
  // - edgeBias ∈ (0..1) → внутри fade‑полосы [0..fadeWidth] вероятность растёт от 0 у кромки до 1 на внутренней границе;
  //   чем больше edgeBias, тем резче переход (edgeBias=1 → «жёсткая» ступень, вся полоса вырезается)
  // - вне fade‑полосы (d >= fadeWidth) вероятность = 1

  const d = signedDistanceToEdge(area, x, z)
  // Если нет fadeWidth — равномерно
  if (!(edge.fadeWidth > 0)) return d >= 0 ? 1 : 0

  const bias = clamp(edge.edgeBias ?? 0, -1, 1)
  // Негативный bias сейчас не оговорён заказчиком — оставим равномерность,
  // при необходимости можно ввести «склонность к кромке» аналогичным образом
  if (bias <= 0) return d >= 0 ? 1 : 0

  // Нормализованный прогресс внутри fade‑полосы: 0 у кромки → 1 на внутренней границе
  const t0 = clamp(d / edge.fadeWidth, 0, 1)
  const t = (edge.fadeCurve === 'smoothstep') ? smoothstep(t0) : t0

  // edgeBias управляет «крутизной» кривой: 0 → плоско (uniform), 0.5 → мягкий переход, 1 → жёсткая ступень
  // Используем экспоненциальную форму: acceptance = t^alpha,
  // где alpha = 1/(1-bias) - 1. Свойства:
  //  - bias=0   → alpha=0  → t^0 = 1 (равномерно)
  //  - bias=0.5 → alpha=1  → t^1 (линейный рост от 0 к 1)
  //  - bias→1   → alpha→∞  → ступень (0 в полосе, 1 на внутренней границе)
  const alpha = (1 / (1 - bias)) - 1

  const acceptanceInFade = Math.pow(t, Math.max(0, alpha))
  // Вне полосы всегда единица
  return (t0 >= 1) ? 1 : clamp(acceptanceInFade, 0, 1)
}

/**
 * Оценивает «эффективную площадь» области при текущем edge‑профиле.
 * Возвращает коэффициент [0..1], на который целесообразно умножать целевое
 * число точек (targetCount) для получения корректной плотности.
 *
 * Реализация: регулярная сетка по bounding box области, учитываются
 * только узлы, попадающие внутрь области; усредняется вероятность
 * edgeAcceptanceProbability.
 */
export function estimateAcceptanceFraction(area: GfxBiomeArea, edge?: GfxBiomeEdgeFalloff): number {
  if (!edge || (edge.edgeBias ?? 0) === 0) return 1
  const bounds = getAreaBounds(area)
  const N = 36 // баланс качества/производительности
  let inside = 0
  let sum = 0
  for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N
    const x = bounds.minX + (bounds.maxX - bounds.minX) * u
    for (let j = 0; j < N; j++) {
      const v = (j + 0.5) / N
      const z = bounds.minZ + (bounds.maxZ - bounds.minZ) * v
      if (!pointInsideArea(area, x, z)) continue
      inside++
      sum += edgeAcceptanceProbability(area, x, z, edge)
    }
  }
  if (inside === 0) return 1
  return clamp(sum / inside, 0, 1)
}

/**
 * Локальный минимальный интервал между точками (локальный spacing),
 * который увеличивается при приближении к краю в зоне fade.
 *
 * Формула: spacing_local = spacing / s(t)^alpha,
 *  t = d / fadeWidth (0..1), s = smoothstep(t) при fadeCurve='smoothstep', иначе t.
 *  alpha = bias / (1 - bias). При bias=0 → alpha=0 → spacing_local = spacing (равномерно).
 *  При bias=0.5 → alpha=1 → spacing_local = spacing / s(t).
 *  При bias→1 → alpha→∞ → spacing_local → ∞ в любой точке полосы fade (точки не ставятся).
 */
export function localMinDistance(area: GfxBiomeArea, x: number, z: number, spacing: number, edge?: GfxBiomeEdgeFalloff): number {
  if (!edge || !edge.fadeWidth || edge.fadeWidth <= 0) return spacing
  const d = signedDistanceToEdge(area, x, z)
  if (d <= 0) return spacing * 1e6 // вне области — запретить
  if (d >= edge.fadeWidth) return spacing
  const eb = clamp(edge.edgeBias ?? 0, -0.999999, 0.999999)
  const t0 = clamp(d / edge.fadeWidth, 0, 1)
  const t = edge.fadeCurve === 'smoothstep' ? smoothstep(t0) : t0

  if (eb === 0) return spacing

  if (eb > 0) {
    // Смещение к центру: увеличиваем локальный интервал к краю
    const alpha = eb / (1 - eb) // 0..∞
    const s = Math.max(1e-6, Math.pow(t, alpha))
    const local = spacing / s
    return Math.min(local, spacing * 1e6)
  } else {
    // Смещение к кромке: уменьшаем локальный интервал к краю,
    // но не ниже динамического минимума, зависящего от |bias|.
    // Чем больше |bias|, тем ниже минимум, но не меньше 0.5*spacing при |bias|=1.
    const k = -eb // (0..1)
    const beta = k / (1 - k) // 0..∞
    const s = Math.max(1e-6, Math.pow(t, beta))
    const minFactor = 1 - 0.5 * k // k=1 → 0.5; k=0.8 → 0.6; k=0 → 1
    const local = Math.max(spacing * minFactor, spacing * s)
    return local
  }
}

/**
 * Оценка средней плотности для адаптивного spacing: возвращает коэффициент
 * (0..1), на который надо умножить baseTarget (по базовому spacing), чтобы
 * получить ожидаемое количество точек при переменном spacing.
 * Плотность ≈ 1 / spacing_local^2, поэтому используем (spacing / local)^2.
 */
export function estimateVariableSpacingDensityFraction(area: GfxBiomeArea, spacing: number, edge?: GfxBiomeEdgeFalloff): number {
  if (!edge || !edge.fadeWidth || edge.fadeWidth <= 0 || spacing <= 0) return 1
  const bounds = getAreaBounds(area)
  const N = 36
  let inside = 0
  let acc = 0
  for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N
    const x = bounds.minX + (bounds.maxX - bounds.minX) * u
    for (let j = 0; j < N; j++) {
      const v = (j + 0.5) / N
      const z = bounds.minZ + (bounds.maxZ - bounds.minZ) * v
      if (!pointInsideArea(area, x, z)) continue
      inside++
      const local = localMinDistance(area, x, z, spacing, edge)
      const ratio = spacing / Math.max(1e-6, local)
      const scale = Math.max(0, Math.min(10, ratio * ratio))
      acc += scale
    }
  }
  if (inside === 0) return 1
  // Для положительного bias средняя плотность <= 1, для отрицательного — может быть > 1
  return acc / inside
}

/**
 * Оценка площади области (для расчёта целевого числа точек по плотности).
 * Прямоугольник: width*depth; круг: PI*r^2; многоугольник: полигональная площадь (shoelace).
 */
export function estimateArea(area: GfxBiomeArea): number {
  if (area.type === 'rect') return area.rect.width * area.rect.depth
  if (area.type === 'circle') return Math.PI * area.circle.radius * area.circle.radius
  return Math.abs(polygonArea(area.points))
}

// ------------------------ Общие геометрические функции из shared/lib ------------------------
// Для внешних потребителей сохраняем те же имена экспортов, перенаправляя на shared реализации.
export { pointInsideRotatedRect, rotatedRectBounds, signedDistanceToRotatedRect } from '@/shared/lib/math/geometry2d'
export { polygonBounds as polygonBounds } from '@/shared/lib/math/geometry2d'
export { pointInsidePolygon as pointInsidePolygon } from '@/shared/lib/math/geometry2d'
export { signedDistanceToPolygon as signedDistanceToPolygon } from '@/shared/lib/math/geometry2d'
export { polygonArea as polygonArea } from '@/shared/lib/math/geometry2d'
export { pointInsideCircle as pointInsideCircle } from '@/shared/lib/math/geometry2d'
export { signedDistanceToCircle as signedDistanceToCircle } from '@/shared/lib/math/geometry2d'
