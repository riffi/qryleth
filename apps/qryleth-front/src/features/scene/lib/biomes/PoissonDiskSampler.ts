import type { GfxBiomeArea, GfxBiomeEdgeFalloff } from '@/entities/biome'
import { getAreaBounds, pointInsideArea, edgeAcceptanceProbability, estimateAcceptanceFraction } from './BiomeAreaUtils'
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
 * Дополнительно поддерживается edge‑взвешивание: коэффициент вероятности принятия
 * кандидата рассчитывается как произведение fadeWeight и edgeBiasWeight, что
 * позволяет смещать плотность к центру (+bias) или к краям (−bias), аналогично
 * Random‑семплингу. При отсутствии параметров edge используется равномерное
 * принятие (как раньше).
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
    const frac = estimateAcceptanceFraction(area, edge)
    targetCount = Math.max(0, Math.round(targetCount * frac))
  }

  const cellSize = minDistance / Math.SQRT2
  const cols = Math.max(1, Math.ceil((bounds.maxX - bounds.minX) / cellSize))
  const rows = Math.max(1, Math.ceil((bounds.maxZ - bounds.minZ) / cellSize))
  const grid: (number[] | null)[][] = Array.from({ length: cols }, () => Array(rows).fill(null))

  const samples: [number, number][] = []
  const active: number[] = []

  // Инициализация: находим первую допустимую точку случайным образом
  for (let tries = 0; tries < 1000 && samples.length === 0; tries++) {
    const x = bounds.minX + (bounds.maxX - bounds.minX) * rng()
    const z = bounds.minZ + (bounds.maxZ - bounds.minZ) * rng()
    if (!pointInsideArea(area, x, z)) continue
    if (acceptByEdge(x, z)) insertSample(x, z)
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
      const r = minDistance * (1 + rng())
      const x = sx + r * Math.cos(ang)
      const z = sz + r * Math.sin(ang)
      if (!pointInsideArea(area, x, z)) continue
      if (isFarEnough(x, z) && acceptByEdge(x, z)) {
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
    if (isFarEnough(x, z) && acceptByEdge(x, z)) insertSample(x, z)
  }

  return samples

  function gridIndex(x: number, z: number): [number, number] {
    const gx = Math.floor((x - bounds.minX) / cellSize)
    const gz = Math.floor((z - bounds.minZ) / cellSize)
    return [gx, gz]
  }

  function isFarEnough(x: number, z: number): boolean {
    const [gx, gz] = gridIndex(x, z)
    const r = 2 // проверяем клетки в радиусе ~2-3
    for (let ix = gx - r; ix <= gx + r; ix++) {
      if (ix < 0 || ix >= cols) continue
      for (let iz = gz - r; iz <= gz + r; iz++) {
        if (iz < 0 || iz >= rows) continue
        const cell = grid[ix][iz]
        if (!cell) continue
        const [px, pz] = cell as [number, number]
        if ((px - x) * (px - x) + (pz - z) * (pz - z) < minDistance * minDistance) return false
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

  /**
   * Проверка принятия кандидата по edge‑весу.
   * Если edge не задан — всегда принимать (эквивалент прежнего поведения).
   */
  function acceptByEdge(x: number, z: number): boolean {
    if (!edge) return true
    const acceptProb = edgeAcceptanceProbability(area, x, z, edge)
    return rng() <= acceptProb
  }
}
