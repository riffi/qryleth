import type { GfxBiomeArea, GfxBiomeScatteringConfig } from '@/entities/biome'
import { getAreaBounds, pointInsideArea, edgeAcceptanceProbability, estimateAcceptanceFraction, estimateArea } from './BiomeAreaUtils'
import { createRng } from '@/shared/lib/utils/prng'

/**
 * Равномерная выборка точек внутри области биома с учётом edge fade/bias.
 *
 * Алгоритм:
 * - оценивает целевое количество точек по плотности и площади области;
 * - выполняет rejection sampling внутри ограничивающего прямоугольника области;
 * - точка принимается, если попадает внутрь области и проходит весовую проверку по краю (fade * bias).
 *
 * Функция чистая и детерминированная при заданном seed.
 */
export function sampleRandomPoints(area: GfxBiomeArea, cfg: GfxBiomeScatteringConfig, seed?: number, softFactor = 0.9): [number, number][] {
  const rng = createRng(seed ?? cfg.seed)
  const baseTarget = estimateMaxCountBySpacing(area, cfg.spacing)
  // Корректируем целевое количество точек по среднему коэффициенту принятия
  const frac = estimateAcceptanceFraction(area, cfg.edge)
  const target = Math.max(0, Math.round(baseTarget * frac))
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
    const acceptProb = edgeAcceptanceProbability(area, x, z, edge)
    if (rng() > acceptProb) continue

    // Мягкий пост‑фильтр по расстоянию: spacing * t
    const minDist = (cfg.spacing || 0) * softFactor
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
