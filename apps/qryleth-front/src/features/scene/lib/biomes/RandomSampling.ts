import type { GfxBiome, GfxBiomeArea, GfxBiomeScatteringConfig } from '@/entities/biome'
import { getAreaBounds, pointInsideArea, fadeWeight, edgeBiasWeight, estimateArea } from './BiomeAreaUtils'
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
export function sampleRandomPoints(area: GfxBiomeArea, cfg: GfxBiomeScatteringConfig, seed?: number): [number, number][] {
  const rng = createRng(seed ?? cfg.seed)
  const target = estimateTargetCount(area, cfg.densityPer100x100)
  const bounds = getAreaBounds(area)

  const points: [number, number][] = []
  // Ограничитель попыток, чтобы избежать бесконечного цикла на «узких» областях
  const maxAttempts = Math.max(2000, target * 50)
  let attempts = 0
  while (points.length < target && attempts < maxAttempts) {
    attempts++
    const x = bounds.minX + (bounds.maxX - bounds.minX) * rng()
    const z = bounds.minZ + (bounds.maxZ - bounds.minZ) * rng()
    if (!pointInsideArea(area, x, z)) continue

    const fw = fadeWeight(area, x, z, cfg.edge)
    if (fw <= 0) continue
    const bw = edgeBiasWeight(area, x, z, cfg.edge)
    const acceptProb = Math.max(0, Math.min(1, fw * bw))
    if (rng() <= acceptProb) points.push([x, z])
  }
  return points
}

/**
 * Оценка целевого числа точек по плотности на 100×100 и площади области.
 */
export function estimateTargetCount(area: GfxBiomeArea, densityPer100: number): number {
  const areaSize = estimateArea(area)
  const factor = areaSize / (100 * 100)
  return Math.max(0, Math.round(densityPer100 * factor))
}

