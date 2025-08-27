import type { GfxBiasSpec, GfxHeightSampler, GfxTerrainOp } from '@/entities/terrain'
import { opBoundingRadius, opsOverlap, slopeFromNormal } from '../utils/TerrainUtils'

/**
 * Вычисляет сводный вес кандидата-операции с учётом bias-правил.
 * Вес ∈ (0..1], 1 — максимально предпочтительно. При отсутствии sampler
 * компоненты preferHeight/preferSlope игнорируются (вес=1 для них).
 *
 * @param op — кандидат операция
 * @param bias — спецификация предпочтений
 * @param sampler — сэмплер высот для расчёта высоты и уклона
 */
export function computeBiasWeight(
  op: GfxTerrainOp,
  bias?: GfxBiasSpec,
  sampler?: GfxHeightSampler
): number {
  if (!bias) return 1
  let weight = 1

  if (bias.preferHeight) {
    const w = bias.preferHeight.weight ?? 1
    if (sampler) {
      const h = sampler.getHeight(op.center[0], op.center[1])
      const min = bias.preferHeight.min ?? -Infinity
      const max = bias.preferHeight.max ?? +Infinity
      const inside = h >= min && h <= max
      const local = inside ? 1 : 0.2
      weight *= (1 - w) + w * local
    }
  }

  if (bias.preferSlope) {
    const w = bias.preferSlope.weight ?? 1
    if (sampler && sampler.getNormal) {
      const n = sampler.getNormal(op.center[0], op.center[1])
      const slope = slopeFromNormal(n)
      const min = bias.preferSlope.min ?? 0
      const max = bias.preferSlope.max ?? Math.PI / 2
      const inside = slope >= min && slope <= max
      const local = inside ? 1 : 0.2
      weight *= (1 - w) + w * local
    }
  }

  return weight
}

/**
 * Отфильтровать и упорядочить кандидатов по весам, с опциональным избежанием
 * пересечений друг с другом и с существующими операциями.
 *
 * Алгоритм: сортировка по весу убыв., затем жадный выбор без пересечений.
 * При отключённом avoidOverlap — возвращает все кандидаты (после сортировки).
 */
export function applyBiasSelection(
  candidates: GfxTerrainOp[],
  bias?: GfxBiasSpec,
  sampler?: GfxHeightSampler,
  existingOps?: GfxTerrainOp[],
): GfxTerrainOp[] {
  if (!bias) return candidates
  const scored = candidates.map(op => ({ op, w: computeBiasWeight(op, bias, sampler) }))
  scored.sort((a, b) => b.w - a.w)
  if (!bias.avoidOverlap) return scored.map(s => s.op)

  const selected: GfxTerrainOp[] = []
  const base = existingOps ?? []
  for (const s of scored) {
    let overlaps = false
    // Проверки с уже существующими опами
    for (const e of base) {
      if (opsOverlap(s.op, e)) { overlaps = true; break }
    }
    if (overlaps) continue
    // Проверки с уже выбранными в этой сессии
    for (const e of selected) {
      if (opsOverlap(s.op, e)) { overlaps = true; break }
    }
    if (!overlaps) selected.push(s.op)
  }
  return selected
}

/**
 * Удобный помощник: учитывает bias и возвращает итоговый набор операций.
 * При отсутствии bias возвращает исходный список кандидатов как есть.
 */
export function processBias(
  candidates: GfxTerrainOp[],
  bias?: GfxBiasSpec,
  sampler?: GfxHeightSampler,
  existingOps?: GfxTerrainOp[],
): GfxTerrainOp[] {
  if (!bias) return candidates
  return applyBiasSelection(candidates, bias, sampler, existingOps)
}

