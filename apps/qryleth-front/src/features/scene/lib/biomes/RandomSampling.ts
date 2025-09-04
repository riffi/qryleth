import type { GfxBiomeArea, GfxBiomeScatteringConfig, GfxBiomeSurfaceMask } from '@/entities/biome'
import { getAreaBounds, pointInsideArea, localMinDistance, estimateVariableSpacingDensityFraction, estimateArea } from './BiomeAreaUtils'
import { createRng } from '@/shared/lib/utils/prng'
import type { SurfaceContext } from './SurfaceMask'
import { createSurfaceMaskEvaluator } from './SurfaceMask'

/**
 * Равномерная выборка точек внутри области биома с учётом edge fade/bias.
 *
 * Алгоритм:
 * - оценивает целевое количество точек по плотности и площади области;
 * - выполняет rejection sampling внутри ограничивающего прямоугольника области;
 * - точка принимается, если попадает внутрь области и проходит весовую проверку по краю
 *   согласно edgeAcceptanceProbability (поддержка fadeWidth+edgeBias).
 *
 * Функция чистая и детерминированная при заданном seed.
 */
/**
 * Равномерная выборка точек с поддержкой edge‑профиля и опциональной surface‑маски.
 *
 * Доп. параметры (опционально):
 * - surfaceMask/surfaceCtx — если заданы, применяются режимы 'reject'/'weight'/'spacing'.
 */
export function sampleRandomPoints(
  area: GfxBiomeArea,
  cfg: GfxBiomeScatteringConfig,
  seed?: number,
  softFactor = 0.9,
  options?: { surfaceMask?: GfxBiomeSurfaceMask; surfaceCtx?: SurfaceContext }
): [number, number][] {
  const rng = createRng(seed ?? cfg.seed)
  const baseTarget = estimateMaxCountBySpacing(area, cfg.spacing)
  // Корректируем целевое количество точек под переменный spacing (fade‑зона разрежена)
  const fracEdge = estimateVariableSpacingDensityFraction(area, cfg.spacing, cfg.edge)

  // Опциональная корректировка по surface‑маске: оценка средней плотности
  let fracSurface = 1
  const useSurface = options?.surfaceMask && options?.surfaceCtx
  const modes = new Set(options?.surfaceMask?.mode || [])
  let evaluator: ReturnType<typeof createSurfaceMaskEvaluator> | undefined
  if (useSurface) {
    evaluator = createSurfaceMaskEvaluator(area, options!.surfaceMask!, options!.surfaceCtx!, 48)
    // Оценка средней плотности по сетке: E[accept] * E[1/spacingFactor^2]
    const bounds = getAreaBounds(area)
    const N = 24
    let inside = 0
    let accAccept = 0
    let accSpacing = 0
    for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N
      const x = bounds.minX + (bounds.maxX - bounds.minX) * u
      for (let j = 0; j < N; j++) {
        const v = (j + 0.5) / N
        const z = bounds.minZ + (bounds.maxZ - bounds.minZ) * v
        if (!pointInsideArea(area, x, z)) continue
        inside++
        const W = evaluator.weightAt(x, z)
        const SF = evaluator.spacingFactorAt(x, z)
        // Вероятность принятия кандидата
        let p = 1
        if (modes.has('reject')) p *= (W > 0 ? 1 : 0)
        if (modes.has('weight')) p *= W
        accAccept += p
        // Вклад spacing в плотность ~ 1 / spacing^2
        if (modes.has('spacing')) accSpacing += 1 / Math.max(1e-6, SF * SF)
        else accSpacing += 1
      }
    }
    if (inside > 0) fracSurface = (accAccept / inside) * (accSpacing / inside)
  }

  const target = Math.max(0, Math.round(baseTarget * fracEdge * fracSurface))
  const bounds = getAreaBounds(area)
  const edge = cfg.edge ?? { fadeWidth: 0, edgeBias: 0, fadeCurve: 'linear' as const }

  const points: [number, number][] = []
  // Ограничитель попыток, чтобы избежать бесконечного цикла на «узких» областях
  const maxAttempts = Math.max(2000, target * 50)
  let attempts = 0
  while (points.length < target && attempts < maxAttempts) {
    attempts++
    const x = bounds.minX + (bounds.maxX - bounds.minX) * rng()
    const z = bounds.minZ + (bounds.maxZ - bounds.minZ) * rng()
    if (!pointInsideArea(area, x, z)) continue
    // Surface‑маска: жёсткий reject и вероятностный weight
    if (useSurface && evaluator) {
      const W = evaluator.weightAt(x, z)
      if (modes.has('reject') && W <= 0) continue
      if (modes.has('weight') && rng() > W) continue
    }
    // Для положительного edgeBias плотность регулируется локальным spacing, без дополнительной вероятности

    // Мягкий пост‑фильтр по расстоянию: spacing * t
    const baseLocal = (localMinDistance(area, x, z, cfg.spacing || 0, cfg.edge) || 0)
    const spacingFactor = (useSurface && evaluator && modes.has('spacing')) ? evaluator.spacingFactorAt(x, z) : 1
    const minDist = baseLocal * spacingFactor * softFactor
    if (minDist > 0) {
      let ok = true
      for (let i = 0; i < points.length; i++) {
        const [px, pz] = points[i]
        const dx = px - x
        const dz = pz - z
        if (dx * dx + dz * dz < minDist * minDist) { ok = false; break }
      }
      if (!ok) continue
    }
    points.push([x, z])
  }
  return points
}

/**
 * Оценка верхней границы числа точек по площади области и spacing (hex‑packing).
 * η ≈ 0.9069, площадь «зоны влияния» точки: A = π · (spacing/2)^2.
 */
export function estimateMaxCountBySpacing(area: GfxBiomeArea, spacing: number): number {
  if (!spacing || spacing <= 0) return 0
  const S = estimateArea(area)
  const eta = 0.9069
  const A = Math.PI * Math.pow(spacing / 2, 2)
  const n = Math.round((eta * S) / A)
  return Math.max(0, n)
}
