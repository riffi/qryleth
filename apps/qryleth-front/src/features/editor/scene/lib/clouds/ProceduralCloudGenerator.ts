import type { GfxCloudsConfig, GfxCloudItem, GfxCloudPlacementArea, GfxProceduralCloudSpec, GfxCloudAppearanceMeta } from '@/entities/cloud'
import { generateRandomSeed, deriveRng, randRange, randIntRange, pickFromNumberOrRange, splitSeed } from '@/features/editor/scene/lib/terrain/utils/PRNGUtils'
import { createRng } from '@/shared/lib/utils/prng'
import { rectToBounds, circleToBounds, randomPointInRect, randomPointInCircle2D, pointInsideRect, pointInsideCircle } from '@/shared/lib/math/geometry2d'
import { clamp, lerp, saturate } from '@/shared/lib/math/number'

/**
 * Процедурный генератор облаков.
 *
 * Генерирует список облаков (позиции и вычисленные визуальные параметры) детерминированно
 * по seed и метапараметрам внешнего вида (appearance). Размещение центров поддерживает
 * режимы uniform, poisson и gridJitter.
 */
export class ProceduralCloudGenerator {
  /**
   * Основной метод генерации облаков из спецификации.
   * Возвращает конфигурацию слоя облаков GfxCloudsConfig.
   */
  generateClouds(spec: GfxProceduralCloudSpec): GfxCloudsConfig {
    const seed = spec.seed ?? generateRandomSeed()
    const count = Array.isArray(spec.count) ? Math.max(0, Math.round(randRange(createRng(seed), spec.count[0], spec.count[1]))) : (spec.count ?? 5)
    const area = spec.area
    if (!area) throw new Error('generateClouds: area не задана и не была предоставлена вызывающей стороной')
    if (count <= 0) return { items: [] }

    // Размещение центров
    const centers = this.placeCenters(spec, area, seed, count)

    // Построение элементов с визуальными параметрами
    const items: GfxCloudItem[] = []
    for (let i = 0; i < centers.length; i++) {
      const [x, z] = centers[i]
      const rng = deriveRng(seed, `cloud_${i}`)
      const y = pickFromNumberOrRange(rng, spec.altitudeY)

      const rotationY = randRange(rng, -Math.PI, Math.PI)
      const visual = mapAppearanceToVisual(spec.appearance, rng)

      const overrides = { ...visual, ...(spec.advancedOverrides || {}) }
      items.push({
        id: `cloud_${i.toString(36)}_${seed.toString(36)}`,
        seed: splitSeed(seed, i),
        position: [x, y, z],
        rotationY,
        advancedOverrides: overrides,
      })
    }

    return { items }
  }

  /**
   * Вычисление позиций центров облаков согласно выбранной стратегии размещения.
   */
  private placeCenters(spec: GfxProceduralCloudSpec, area: GfxCloudPlacementArea, seed: number, count: number): [number, number][] {
    const rng = createRng(seed)
    switch (spec.placement) {
      case 'uniform':
        return sampleUniform(area, count, rng)
      case 'gridJitter': {
        const cell = spec.cell || estimateCellFromCount(area, count)
        const jitter = typeof spec.jitter === 'number' ? spec.jitter : 0.5
        return sampleGridJitter(area, cell, jitter, rng).slice(0, count)
      }
      case 'poisson': {
        const d = spec.minDistance ?? Math.max(5, estimateCellFromCount(area, count) * 0.8)
        return samplePoisson(area, d, count, rng)
      }
      default:
        return sampleUniform(area, count, rng)
    }
  }
}

/**
 * Хелпер: превратить appearance‑метапараметры в визуальные поля рендера.
 * Простое эвристическое сопоставление с учётом variance и seed‑потока.
 */
function mapAppearanceToVisual(appearance: GfxCloudAppearanceMeta | undefined, rng: () => number): Required<NonNullable<GfxCloudItem['advancedOverrides']>> {
  const preset = appearance?.stylePreset ?? 'cumulus'
  const sizeLevel = Math.round(clamp(appearance?.sizeLevel ?? 3, 1, 5))
  const softness = saturate(appearance?.softnessLevel ?? 0.7)
  const dynamics = saturate(appearance?.dynamicsLevel ?? 0.4)
  const colorTone = appearance?.colorTone ?? 'white'
  const variance = saturate(appearance?.variance ?? 0.4)

  // Базовые диапазоны по пресетам
  const base: { segments: [number, number]; boundsX: [number, number]; boundsY: [number, number]; boundsZ: [number, number]; volume: [number, number]; opacity: [number, number]; growth: [number, number]; anim: [number, number]; drift: [number, number] } = (() => {
    switch (preset) {
      case 'stratus':
        return { segments: [6, 10], boundsX: [30, 60], boundsY: [6, 12], boundsZ: [30, 60], volume: [220, 320], opacity: [0.15, 0.25], growth: [0.3, 0.45], anim: [0.08, 0.18], drift: [0.8, 1.1] }
      case 'cirrus':
        return { segments: [6, 10], boundsX: [20, 40], boundsY: [4, 10], boundsZ: [20, 40], volume: [140, 220], opacity: [0.08, 0.18], growth: [0.25, 0.4], anim: [0.06, 0.14], drift: [1.0, 1.4] }
      case 'storm':
        return { segments: [10, 16], boundsX: [50, 90], boundsY: [18, 30], boundsZ: [50, 90], volume: [360, 520], opacity: [0.25, 0.45], growth: [0.5, 0.8], anim: [0.12, 0.28], drift: [0.6, 1.0] }
      default: // cumulus
        return { segments: [8, 14], boundsX: [22, 48], boundsY: [10, 20], boundsZ: [22, 48], volume: [260, 380], opacity: [0.18, 0.28], growth: [0.4, 0.7], anim: [0.1, 0.22], drift: [0.9, 1.2] }
    }
  })()

  // Влияние sizeLevel на масштабы (bounds/volume)
  const sizeScale = 0.6 + (sizeLevel - 1) * 0.2 // 1→0.6 .. 5→1.4

  const seg = Math.round(lerp(base.segments[0], base.segments[1], vary(rng, variance)))
  const bx = lerp(base.boundsX[0], base.boundsX[1], vary(rng, variance)) * sizeScale
  const by = lerp(base.boundsY[0], base.boundsY[1], vary(rng, variance)) * (0.6 + softness * 0.8)
  const bz = lerp(base.boundsZ[0], base.boundsZ[1], vary(rng, variance)) * sizeScale
  const vol = lerp(base.volume[0], base.volume[1], vary(rng, variance)) * sizeScale
  const op = saturate(lerp(base.opacity[0], base.opacity[1], vary(rng, variance)) * (0.8 + softness * 0.4))
  const gr = lerp(base.growth[0], base.growth[1], vary(rng, variance)) * (0.8 + dynamics)
  const an = lerp(base.anim[0], base.anim[1], vary(rng, variance)) * (0.6 + dynamics)
  const df = lerp(base.drift[0], base.drift[1], vary(rng, variance))

  const color = pickColor(colorTone, rng)

  return {
    segments: seg,
    bounds: [bx, by, bz],
    volume: vol,
    opacity: op,
    color,
    growth: gr,
    animationSpeed: an,
    driftFactor: df,
  }
}

function pickColor(tone: NonNullable<GfxCloudAppearanceMeta['colorTone']>, rng: () => number): string {
  switch (tone) {
    case 'warm': return sample(['#ffffff', '#fff2e0', '#ffe7cc', '#ffe1b5'], rng)
    case 'cold': return sample(['#ffffff', '#f0f6ff', '#e6f2ff', '#dbeeff'], rng)
    case 'sunset': return sample(['#fff1e6', '#ffd9c2', '#ffc299', '#ffb380'], rng)
    default: return sample(['#ffffff', '#f8fbff', '#f4f7fb'], rng)
  }
}

// Простые стратегии размещения
function sampleUniform(area: GfxCloudPlacementArea, count: number, rng: () => number): [number, number][] {
  const res: [number, number][] = []
  for (let i = 0; i < count; i++) {
    res.push(randomPointInArea(area, rng))
  }
  return res
}

function sampleGridJitter(area: GfxCloudPlacementArea, cell: number, jitter: number, rng: () => number): [number, number][] {
  if (cell <= 0) return []
  const res: [number, number][] = []
  const { minX, maxX, minZ, maxZ } = areaBounds(area)
  for (let x = minX; x <= maxX; x += cell) {
    for (let z = minZ; z <= maxZ; z += cell) {
      // базовая точка — центр ячейки
      const cx = x + Math.min(cell, maxX - x) * 0.5
      const cz = z + Math.min(cell, maxZ - z) * 0.5
      // джиттер внутри доли от cell
      const jx = (rng() * 2 - 1) * cell * (jitter ?? 0.5)
      const jz = (rng() * 2 - 1) * cell * (jitter ?? 0.5)
      const px = cx + jx
      const pz = cz + jz
      if (pointInsideArea(area, px, pz)) res.push([px, pz])
    }
  }
  return res
}

function samplePoisson(area: GfxCloudPlacementArea, minDist: number, targetCount: number, rng: () => number): [number, number][] {
  if (minDist <= 0) return sampleUniform(area, targetCount, rng)
  const { minX, maxX, minZ, maxZ } = areaBounds(area)
  const cellSize = minDist / Math.SQRT2
  const cols = Math.max(1, Math.ceil((maxX - minX) / cellSize))
  const rows = Math.max(1, Math.ceil((maxZ - minZ) / cellSize))
  const grid: ([number, number] | null)[][] = Array.from({ length: cols }, () => Array(rows).fill(null))
  const samples: [number, number][] = []
  const active: number[] = []

  function gridIndex(x: number, z: number): [number, number] {
    const gx = Math.floor((x - minX) / cellSize)
    const gz = Math.floor((z - minZ) / cellSize)
    return [gx, gz]
  }
  function isFarEnough(x: number, z: number): boolean {
    const [gx, gz] = gridIndex(x, z)
    const rCells = Math.ceil(minDist / cellSize) + 1
    for (let ix = gx - rCells; ix <= gx + rCells; ix++) {
      if (ix < 0 || ix >= cols) continue
      for (let iz = gz - rCells; iz <= gz + rCells; iz++) {
        if (iz < 0 || iz >= rows) continue
        const cell = grid[ix][iz]
        if (!cell) continue
        const [px, pz] = cell
        const dx = px - x
        const dz = pz - z
        if (dx * dx + dz * dz < minDist * minDist) return false
      }
    }
    return true
  }
  function insertSample(x: number, z: number) {
    const [gx, gz] = gridIndex(x, z)
    grid[gx][gz] = [x, z]
    samples.push([x, z])
    active.push(samples.length - 1)
  }

  // начальные попытки
  let attempts = 0
  while (samples.length < Math.min(5, targetCount) && attempts++ < 2000) {
    const [x, z] = randomPointInArea(area, rng)
    if (isFarEnough(x, z)) insertSample(x, z)
  }

  const k = 15
  const maxLoops = Math.max(5000, targetCount * 40)
  let loops = 0
  while (active.length > 0 && samples.length < targetCount && loops++ < maxLoops) {
    const idx = active[Math.floor(rng() * active.length)]
    const [sx, sz] = samples[idx]
    let ok = false
    for (let i = 0; i < k; i++) {
      const ang = 2 * Math.PI * rng()
      const r = minDist * (1 + rng())
      const x = sx + r * Math.cos(ang)
      const z = sz + r * Math.sin(ang)
      if (!pointInsideArea(area, x, z)) continue
      if (isFarEnough(x, z)) { insertSample(x, z); ok = true; break }
    }
    if (!ok) {
      const pos = active.indexOf(idx)
      if (pos >= 0) active.splice(pos, 1)
    }
  }

  // добор
  attempts = 0
  while (samples.length < targetCount && attempts++ < 2000) {
    const [x, z] = randomPointInArea(area, rng)
    if (isFarEnough(x, z)) insertSample(x, z)
  }
  return samples
}

// Геометрические утилиты
/**
 * Возвращает ограничивающий прямоугольник (BoundRect) для области размещения облаков.
 * Для прямоугольника используется осевая форма Rect2D (x,z,width,depth),
 * для круга — центр (x,z) и радиус. Нужен для оценки площади и построения сеток.
 */
function areaBounds(area: GfxCloudPlacementArea): { minX: number; maxX: number; minZ: number; maxZ: number } {
  return area.kind === 'rect' ? rectToBounds(area) : circleToBounds(area)
}
/**
 * Возвращает равномерно распределённую случайную точку [x,z] внутри заданной области.
 * Для прямоугольника — равномерно по площади; для круга — по площади с корневой выборкой радиуса.
 * rng — детерминированный генератор псевдослучайных чисел [0..1).
 */
function randomPointInArea(area: GfxCloudPlacementArea, rng: () => number): [number, number] {
  return area.kind === 'rect' ? randomPointInRect(area, rng) : randomPointInCircle2D(area, rng)
}
/**
 * Проверяет попадание точки (x,z) в область размещения облаков.
 * Для прямоугольника проверяется попадание в осевой Rect2D,
 * для круга — в окружность по центру и радиусу.
 */
function pointInsideArea(area: GfxCloudPlacementArea, x: number, z: number): boolean {
  return area.kind === 'rect' ? pointInsideRect(area, x, z) : pointInsideCircle(area, x, z)
}
function estimateCellFromCount(area: GfxCloudPlacementArea, count: number): number {
  const b = areaBounds(area)
  const areaSize = Math.max(1e-6, (b.maxX - b.minX) * (b.maxZ - b.minZ))
  return Math.sqrt(areaSize / Math.max(1, count))
}

// Мелкие утилиты
function vary(rng: () => number, variance: number): number { return saturate(0.5 + (rng() - 0.5) * 2 * variance) }
function sample<T>(arr: T[], rng: () => number): T { return arr[Math.floor(rng() * arr.length)] }

export default ProceduralCloudGenerator
