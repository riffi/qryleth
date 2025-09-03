import type { GfxBiomeArea, GfxBiomeEdgeFalloff } from '@/entities/biome'
import { getAreaBounds, pointInsideArea, localMinDistance, estimateVariableSpacingDensityFraction } from './BiomeAreaUtils'
import { createRng } from '@/shared/lib/utils/prng'

/**
 * Poisson‑disk выборка точек (blue noise) в пределах произвольной области.
 *
 * Реализация основана на грид‑акселерации:
 * - Грид с шагом cellSize = minDistance / sqrt(2)
 * - Для каждой точки проверяем соседние клетки (квадрат 5×5) на соблюдение minDistance
 * - Кандидаты генерируются вокруг активных точек (k попыток) и/или случайно в области
 *
 * Упрощённая версия: для стабильности ограничены итерации и размер списков.
 * Функция чистая и детерминированная при заданном seed.
 *
 * Дополнительно поддерживается edge‑взвешивание: вероятность принятия кандидата
 * рассчитывается функцией edgeAcceptanceProbability (учёт fadeWidth и edgeBias).
 * Для стабилизации плотности targetCount предварительно корректируется по
 * estimateAcceptanceFraction, чтобы алгоритм не «добивал» край.
 */
export function samplePoissonDisk(
  area: GfxBiomeArea,
  minDistance: number,
  targetCount: number,
  seed?: number,
  edge?: GfxBiomeEdgeFalloff
): [number, number][] {
  if (minDistance <= 0) return []
  const rng = createRng(seed)
  const bounds = getAreaBounds(area)

  // Корректируем целевое число точек с учётом edge‑профиля,
  // иначе алгоритм будет «добивать» край, чтобы достичь targetCount
  if (edge && (edge.edgeBias ?? 0) !== 0) {
    const frac = estimateVariableSpacingDensityFraction(area, minDistance, edge)
    targetCount = Math.max(0, Math.round(targetCount * frac))
  }

  const baseSpacing = minDistance
  const cellSize = baseSpacing / Math.SQRT2
  const cols = Math.max(1, Math.ceil((bounds.maxX - bounds.minX) / cellSize))
  const rows = Math.max(1, Math.ceil((bounds.maxZ - bounds.minZ) / cellSize))
  const grid: (number[] | null)[][] = Array.from({ length: cols }, () => Array(rows).fill(null))

  const samples: [number, number][] = []
  const active: number[] = []

  // Инициализация несколькими затравками, чтобы уменьшить локальные кластеры
  const initialSeeds = Math.max(1, Math.min(5, Math.floor(targetCount / 80) + 1))
  for (let tries = 0; tries < 2000 && samples.length < initialSeeds; tries++) {
    const x = bounds.minX + (bounds.maxX - bounds.minX) * rng()
    const z = bounds.minZ + (bounds.maxZ - bounds.minZ) * rng()
    if (!pointInsideArea(area, x, z)) continue
    if (isFarEnough(x, z)) insertSample(x, z)
  }

  const k = 15 // число попыток вокруг активной точки
  const maxLoops = Math.max(5000, targetCount * 50)
  let loops = 0
  while (active.length > 0 && samples.length < targetCount && loops++ < maxLoops) {
    const idx = active[Math.floor(rng() * active.length)]
    const [sx, sz] = samples[idx]
    let found = false
    for (let i = 0; i < k; i++) {
      const ang = 2 * Math.PI * rng()
      // Используем локальный spacing в точке кандидата
      // Генерим радиус от локального до 2×локального
      const tryX = sx + (baseSpacing) * Math.cos(ang) // предварительный вектор направления
      const tryZ = sz + (baseSpacing) * Math.sin(ang)
      const localR = localMinDistance(area, tryX, tryZ, baseSpacing, edge)
      // Минимальная длина шага — чтобы избежать «микрокластеров» при очень малом localR
      const MIN_STEP_FACTOR = 0.6 // 60% от базового интервала
      const stepBase = Math.max(localR, baseSpacing * MIN_STEP_FACTOR)
      const r = stepBase * (1 + rng())
      const x = sx + r * Math.cos(ang)
      const z = sz + r * Math.sin(ang)
      if (!pointInsideArea(area, x, z)) continue
      if (isFarEnough(x, z)) {
        insertSample(x, z)
        found = true
        break
      }
    }
    if (!found) {
      // Удаляем из активных
      const pos = active.indexOf(idx)
      if (pos >= 0) active.splice(pos, 1)
    }
  }

  // Запасной режим: если точек мало — добираем rejection sampling'ом
  const fallbackMax = Math.max(2000, targetCount * 20)
  let attempts = 0
  while (samples.length < targetCount && attempts++ < fallbackMax) {
    const x = bounds.minX + (bounds.maxX - bounds.minX) * rng()
    const z = bounds.minZ + (bounds.maxZ - bounds.minZ) * rng()
    if (!pointInsideArea(area, x, z)) continue
    if (isFarEnough(x, z)) insertSample(x, z)
  }

  return samples

  function gridIndex(x: number, z: number): [number, number] {
    const gx = Math.floor((x - bounds.minX) / cellSize)
    const gz = Math.floor((z - bounds.minZ) / cellSize)
    return [gx, gz]
  }

  function isFarEnough(x: number, z: number): boolean {
    const [gx, gz] = gridIndex(x, z)
    const localR = localMinDistance(area, x, z, baseSpacing, edge)
    const rCells = Math.ceil(localR / cellSize) + 1
    for (let ix = gx - rCells; ix <= gx + rCells; ix++) {
      if (ix < 0 || ix >= cols) continue
      for (let iz = gz - rCells; iz <= gz + rCells; iz++) {
        if (iz < 0 || iz >= rows) continue
        const cell = grid[ix][iz]
        if (!cell) continue
        const [px, pz] = cell as [number, number]
        const minR = Math.max(localR, localMinDistance(area, px, pz, baseSpacing, edge))
        if ((px - x) * (px - x) + (pz - z) * (pz - z) < minR * minR) return false
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

  // При положительном edgeBias эффект края реализован через переменный локальный spacing,
  // поэтому дополнительная стохастическая фильтрация не требуется.
}
