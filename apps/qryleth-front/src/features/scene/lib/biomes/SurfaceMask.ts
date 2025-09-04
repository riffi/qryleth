import type { GfxBiomeArea, GfxBiomeSurfaceMask } from '@/entities/biome'
import type { GfxHeightSampler } from '@/entities/terrain'
import { getAreaBounds } from './BiomeAreaUtils'
import { clamp, smoothstep } from '@/shared/lib/math/number'

/**
 * Поверхностная маска для скаттеринга: расчёт веса W(x,z) и фактора spacing.
 *
 * Данный модуль не выполняет выбор точек — он предоставляет чистые утилиты,
 * которые можно использовать внутри любых генераторов (random/poisson) для
 * оценки пригодности позиции относительно рельефа.
 *
 * ВАЖНО:
 * - Если маска `surface` не задана — должен использоваться путь «по умолчанию»
 *   в вызывающем коде (не вызывать данные функции вовсе).
 * - Если подходящий террейн‑слой на координате (x,z) не найден — вне террейна
 *   — возвращаем W=0 (жёсткий reject) и spacingFactor=1 (для совместимости).
 */

/**
 * Контекст поверхности: абстракция над выбором источника высот по (x,z).
 * Возвращает сэмплер высот и уровень моря для слоя (если он используется).
 */
export interface SurfaceContext {
  getAt: (x: number, z: number) => { sampler: GfxHeightSampler; seaLevel: number } | null
}

/**
 * Результат оценки маски в точке.
 */
export interface SurfaceEvaluation {
  weight: number // W ∈ [0..1]
  spacingFactor: number // множитель для локального spacing (>= 0), 1 — без изменений
}

/**
 * Вычислить вес по диапазону с «мягкими» границами.
 *
 * Алгоритм: жёсткие края с плавным переходом шириной e = soft * (max-min) / 2.
 * - value <= min      → 0
 * - [min .. min+e]   → плавный вход (smoothstep)
 * - [min+e .. max-e] → 1
 * - [max-e .. max]   → плавный выход (smoothstep)
 * - value >= max      → 0
 */
function rangeWeight(value: number, min: number, max: number, soft = 0): number {
  if (!isFinite(value)) return 0
  if (min > max) { const t = min; min = max; max = t }
  if (min === max) return value === min ? 1 : 0
  const width = max - min
  const e = clamp(soft ?? 0, 0, 1) * width * 0.5
  if (value <= min) return 0
  if (value >= max) return 0
  if (e <= 1e-12) return 1
  if (value < min + e) {
    const t = (value - min) / e
    return smoothstep(clamp(t, 0, 1))
  }
  if (value > max - e) {
    const t = (max - value) / e
    return smoothstep(clamp(t, 0, 1))
  }
  return 1
}

/**
 * Объединение факторов по правилу combine.
 * - 'mul' — перемножение факторов; веса интерпретируются как экспоненты (f^w)
 * - 'min' / 'max' — минимальное/максимальное из факторов (веса игнорируются)
 * - 'avg' — среднее с весами (по умолчанию равные)
 */
function combineFactors(
  factors: Array<{ key: 'h' | 's' | 'c'; value: number }>,
  combine: GfxBiomeSurfaceMask['combine'],
  weight?: GfxBiomeSurfaceMask['weight']
): number {
  if (factors.length === 0) return 1
  const mode = combine || 'mul'
  if (mode === 'min') return factors.reduce((m, f) => Math.min(m, f.value), 1)
  if (mode === 'max') return factors.reduce((m, f) => Math.max(m, f.value), 0)
  if (mode === 'avg') {
    let sum = 0
    let wsum = 0
    for (const f of factors) {
      const w = f.key === 'h' ? (weight?.byHeight ?? 1)
        : f.key === 's' ? (weight?.bySlope ?? 1)
        : (weight?.byCurvature ?? 1)
      sum += f.value * w
      wsum += w
    }
    return wsum > 0 ? clamp(sum / wsum, 0, 1) : 1
  }
  // mul (с весами как экспонентами)
  let acc = 1
  for (const f of factors) {
    const w = f.key === 'h' ? (weight?.byHeight ?? 1)
      : f.key === 's' ? (weight?.bySlope ?? 1)
      : (weight?.byCurvature ?? 1)
    const exp = Math.max(0, w)
    const v = clamp(f.value, 0, 1)
    acc *= exp === 1 ? v : Math.pow(v, exp)
  }
  return clamp(acc, 0, 1)
}

/**
 * Вычислить W и spacingFactor в точке (x,z) БЕЗ кэширования.
 * Возвращает { weight, spacingFactor }.
 *
 * Если sampler отсутствует (вне террейна) — weight=0, spacingFactor=1.
 */
export function evaluateSurfaceAtPoint(
  x: number,
  z: number,
  mask: GfxBiomeSurfaceMask,
  ctx: SurfaceContext
): SurfaceEvaluation {
  const src = ctx.getAt(x, z)
  if (!src) return { weight: 0, spacingFactor: 1 }
  const { sampler, seaLevel } = src

  const modes = new Set(mask.mode || [])

  // Факторы: высота, наклон, кривизна
  const factors: Array<{ key: 'h' | 's' | 'c'; value: number }> = []

  // Высота: absolute world Y, либо относительно seaLevel/константы
  if (mask.height) {
    const Y = sampler.getHeight(x, z)
    const ref = mask.height.reference
    const v = typeof ref === 'number' ? (Y - ref)
      : (ref === 'seaLevel' ? (Y - seaLevel) : Y)
    const [hmin, hmax] = mask.height.range ?? [-Infinity, Infinity]
    const hw = rangeWeight(v, hmin, hmax, mask.height.soft ?? 0)
    factors.push({ key: 'h', value: hw })
  }

  // Наклон: угол между нормалью и осью Y (в градусах)
  if (mask.slopeDeg) {
    const n = sampler.getNormal(x, z)
    const ny = clamp(n[1], -1, 1)
    const slopeDeg = Math.acos(ny) * 180 / Math.PI
    const [smin, smax] = mask.slopeDeg.range ?? [-Infinity, Infinity]
    const sw = rangeWeight(slopeDeg, smin, smax, mask.slopeDeg.soft ?? 0)
    factors.push({ key: 's', value: sw })
  }

  // Кривизна: оценка по вторым производным высоты
  if (mask.curvature) {
    // Локальная численная оценка: 5-точечная маска (см. colorUtils.calculateCurvature)
    // Чтобы не создавать жёсткую зависимость — используем доступный сэмплер напрямую
    const step = mask.curvature.step ?? 1.0
    const h0 = sampler.getHeight(x, z)
    const hx1 = sampler.getHeight(x - step, z)
    const hx2 = sampler.getHeight(x + step, z)
    const hz1 = sampler.getHeight(x, z - step)
    const hz2 = sampler.getHeight(x, z + step)
    const d2dx2 = (hx1 - 2 * h0 + hx2) / (step * step)
    const d2dz2 = (hz1 - 2 * h0 + hz2) / (step * step)
    const curvature = Math.abs((d2dx2 + d2dz2) / 2)
    // Эмпирическая нормализация (как в colorUtils): множитель 10 → [0..1]
    const curv01 = clamp(curvature * 10, 0, 1)
    const [cmin, cmax] = mask.curvature.range ?? [-Infinity, Infinity]
    const cw = rangeWeight(curv01, cmin, cmax, mask.curvature.soft ?? 0)
    factors.push({ key: 'c', value: cw })
  }

  const W = combineFactors(factors, mask.combine, mask.weight)

  // Маппинг в spacingFactor: чем ниже W, тем разреженнее (больше множитель)
  let spacingFactor = 1
  if (modes.has('spacing')) {
    const minF = mask.spacingScale?.minFactor ?? 1
    const maxF = mask.spacingScale?.maxFactor ?? 1
    spacingFactor = clamp(minF + (maxF - minF) * (1 - W), 0, Math.max(minF, maxF))
  }

  return { weight: clamp(W, 0, 1), spacingFactor }
}

/**
 * Фабрика кэшированного оценщика для заданной области биома.
 * Строит сетку предвычисленных значений W и spacingFactor в пределах AABB области
 * и предоставляет функции билинейной интерполяции в произвольной точке.
 */
export function createSurfaceMaskEvaluator(
  area: GfxBiomeArea,
  mask: GfxBiomeSurfaceMask,
  ctx: SurfaceContext,
  gridResolution = 64
): SurfaceEvaluation & {
  weightAt: (x: number, z: number) => number
  spacingFactorAt: (x: number, z: number) => number
} {
  const bounds = getAreaBounds(area)
  const cols = Math.max(2, Math.min(256, gridResolution))
  const rows = Math.max(2, Math.min(256, gridResolution))
  const wGrid = new Float32Array(cols * rows)
  const sGrid = new Float32Array(cols * rows)

  // Предрасчёт по центрам ячеек
  for (let j = 0; j < rows; j++) {
    const v = (j + 0.5) / rows
    const z = bounds.minZ + (bounds.maxZ - bounds.minZ) * v
    for (let i = 0; i < cols; i++) {
      const u = (i + 0.5) / cols
      const x = bounds.minX + (bounds.maxX - bounds.minX) * u
      const ev = evaluateSurfaceAtPoint(x, z, mask, ctx)
      const idx = j * cols + i
      wGrid[idx] = ev.weight
      sGrid[idx] = ev.spacingFactor
    }
  }

  function sampleBilinear(grid: Float32Array, gx: number, gz: number): number {
    const x = clamp(gx, 0, cols - 1)
    const z = clamp(gz, 0, rows - 1)
    const x0 = Math.floor(x), z0 = Math.floor(z)
    const x1 = Math.min(cols - 1, x0 + 1)
    const z1 = Math.min(rows - 1, z0 + 1)
    const tx = x - x0
    const tz = z - z0
    const i00 = z0 * cols + x0
    const i10 = z0 * cols + x1
    const i01 = z1 * cols + x0
    const i11 = z1 * cols + x1
    const v00 = grid[i00]
    const v10 = grid[i10]
    const v01 = grid[i01]
    const v11 = grid[i11]
    const vx0 = v00 * (1 - tx) + v10 * tx
    const vx1 = v01 * (1 - tx) + v11 * tx
    return vx0 * (1 - tz) + vx1 * tz
  }

  function toGridX(x: number): number {
    const u = (x - bounds.minX) / (bounds.maxX - bounds.minX + 1e-12)
    return u * cols - 0.5
  }
  function toGridZ(z: number): number {
    const v = (z - bounds.minZ) / (bounds.maxZ - bounds.minZ + 1e-12)
    return v * rows - 0.5
  }

  const weightAt = (x: number, z: number): number => sampleBilinear(wGrid, toGridX(x), toGridZ(z))
  const spacingFactorAt = (x: number, z: number): number => sampleBilinear(sGrid, toGridX(x), toGridZ(z))

  // Для совместимости возвращаем также последнее вычисленное значение (не используется)
  return {
    weight: 1,
    spacingFactor: 1,
    weightAt,
    spacingFactorAt,
  }
}

