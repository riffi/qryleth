import type { GfxPlacementArea, GfxPlacementSpec } from '@/entities/terrain'
import { areaToWorldRect, dist2, isInsideArea, isInsideRect, makeWorldRect, randomPointInCircle, randomPointInRect } from './PlacementUtils'

/**
 * Результат размещения — набор мировых координат центров операций.
 */
export type PlacementPoint = { x: number; z: number }

/**
 * Унифицированные опции для алгоритмов размещения.
 */
export interface PlacementOptions {
  /** Ширина мира (X) в мировых единицах */
  worldWidth: number
  /** Высота мира (Z) в мировых единицах */
  worldHeight: number
  /** Дополнительное ограничение области (прямоугольник/круг) */
  area?: GfxPlacementArea
}

/**
 * Главная функция-обертка для размещения точек по спецификации.
 *
 * Детерминированна при использовании детерминированного RNG.
 *
 * @param spec — спецификация алгоритма размещения (uniform/poisson/gridJitter/ring)
 * @param count — желаемое количество точек
 * @param rng — детерминированный генератор случайных чисел в [0..1)
 * @param opts — габариты мира и опциональная ограничивающая область
 */
export function placePoints(
  spec: GfxPlacementSpec,
  count: number,
  rng: () => number,
  opts: PlacementOptions
): PlacementPoint[] {
  switch (spec.type) {
    case 'uniform':
      return placeUniform(count, rng, opts)
    case 'poisson':
      return placePoisson(count, spec.minDistance, rng, opts)
    case 'gridJitter':
      return placeGridJitter(count, spec.cell, spec.jitter ?? 0.5, rng, opts)
    case 'ring':
      return placeRing(count, spec.center[0], spec.center[1], spec.rMin, spec.rMax, rng, opts)
    default:
      const allowed = ['uniform', 'poisson', 'gridJitter', 'ring']
      const value = (spec as any)?.type
      throw new Error(
        `Неподдерживаемый placement.type: '${value}'. Ожидалось одно из: ${allowed.join(', ')}.`
      )
  }
}

/**
 * Равномерное случайное размещение внутри области (или всего мира).
 *
 * @param count — количество точек
 * @param rng — PRNG [0..1)
 * @param opts — габариты мира и область
 */
export function placeUniform(count: number, rng: () => number, opts: PlacementOptions): PlacementPoint[] {
  const rect = areaToWorldRect(opts.worldWidth, opts.worldHeight, opts.area)
  const out: PlacementPoint[] = []
  for (let i = 0; i < count; i++) {
    const [x, z] = randomPointInRect(rect, rng)
    // Если area — круг, прямоугольник уже охватывающий; проверим точное попадание
    if (!opts.area || isInsideArea(opts.worldWidth, opts.worldHeight, x, z, opts.area)) {
      out.push({ x, z })
    } else {
      // Пробуем несколько раз найти точку внутри фактической области
      let tries = 0
      while (tries < 10) {
        const [xx, zz] = randomPointInRect(rect, rng)
        if (isInsideArea(opts.worldWidth, opts.worldHeight, xx, zz, opts.area)) {
          out.push({ x: xx, z: zz })
          break
        }
        tries++
      }
      if (out.length < i + 1) {
        // если не нашли подходящую точку за разумное число попыток — просто пропускаем
        // чтобы не попасть в бесконечный цикл на микроскопических областях
      }
    }
  }
  return out
}

/**
 * Размещение по сетке с дрожанием (jitter) в каждой ячейке.
 *
 * Ячейки сетки обходятся слева-направо, сверху-вниз. В каждую ячейку добавляется
 * одна точка со случайным смещением в пределах ±jitter*cell/2 по каждой оси.
 * Если задана область — игнорируются точки вне области.
 * Возвращается не более `count` точек.
 *
 * @param count — максимальное количество точек
 * @param cell — размер ячейки сетки (в мировых единицах)
 * @param jitter — доля смещения относительно половины размера ячейки (0..1)
 * @param rng — PRNG [0..1)
 * @param opts — габариты мира и область
 */
export function placeGridJitter(
  count: number,
  cell: number,
  jitter: number,
  rng: () => number,
  opts: PlacementOptions
): PlacementPoint[] {
  const rect = areaToWorldRect(opts.worldWidth, opts.worldHeight, opts.area)
  const out: PlacementPoint[] = []

  const jitterAmp = Math.max(0, Math.min(1, jitter)) * (cell / 2)

  // Стартовые координаты по сетке близко к левому нижнему краю прямоугольника
  const startX = rect.minX
  const startZ = rect.minZ
  const endX = rect.maxX
  const endZ = rect.maxZ

  for (let z = startZ; z <= endZ; z += cell) {
    for (let x = startX; x <= endX; x += cell) {
      let px = x + cell / 2
      let pz = z + cell / 2

      // Применяем дрожание в пределах допустимого диапазона
      px += (rng() * 2 - 1) * jitterAmp
      pz += (rng() * 2 - 1) * jitterAmp

      // Проверка попадания (для круглой области и краёв)
      if (!opts.area || isInsideArea(opts.worldWidth, opts.worldHeight, px, pz, opts.area)) {
        out.push({ x: px, z: pz })
        if (out.length >= count) return out
      }
    }
  }
  return out
}

/**
 * Размещение по правилу «равномерный случайный с запретом ближе minDistance» (Poisson-like).
 *
 * Реализовано простым «дротикованием» (dart throwing): генерируем кандидатов в пределах области,
 * принимаем точку, если она не ближе minDistance к уже принятым. Ограничиваем число попыток,
 * чтобы избежать долгих зацикливаний на маленьких областях.
 *
 * @param count — желаемое количество точек
 * @param minDistance — минимальная разрешённая дистанция между точками
 * @param rng — PRNG [0..1)
 * @param opts — габариты мира и область
 */
export function placePoisson(
  count: number,
  minDistance: number,
  rng: () => number,
  opts: PlacementOptions
): PlacementPoint[] {
  const rect = areaToWorldRect(opts.worldWidth, opts.worldHeight, opts.area)
  const out: PlacementPoint[] = []
  const minD2 = Math.max(0, minDistance) * Math.max(0, minDistance)

  const maxTries = Math.max(50, count * 30)
  let tries = 0

  while (out.length < count && tries < maxTries) {
    let x: number, z: number
    if (opts.area && opts.area.kind === 'circle') {
      ;[x, z] = randomPointInCircle(opts.area.x, opts.area.z, opts.area.radius, rng)
    } else {
      ;[x, z] = randomPointInRect(rect, rng)
    }
    tries++

    if (opts.area && !isInsideArea(opts.worldWidth, opts.worldHeight, x, z, opts.area)) continue

    let ok = true
    for (const p of out) {
      if (dist2(p.x, p.z, x, z) < minD2) {
        ok = false
        break
      }
    }
    if (!ok) continue
    out.push({ x, z })
  }

  return out
}

/**
 * Размещение по кольцу (annulus): точки располагаются вокруг заданного центра
 * на расстоянии в диапазоне [rMin..rMax]. Угол равномерно распределяется по 2π
 * с небольшим случайным сдвигом; радиус берётся равномерно из диапазона.
 * Точки, вышедшие за пределы мира или области, отбрасываются; выполняются попытки
 * добора до требуемого количества с ограничением числа попыток.
 *
 * @param count — желаемое количество точек
 * @param cx — центр X кольца
 * @param cz — центр Z кольца
 * @param rMin — минимальный радиус
 * @param rMax — максимальный радиус
 * @param rng — PRNG [0..1)
 * @param opts — габариты мира и область
 */
export function placeRing(
  count: number,
  cx: number,
  cz: number,
  rMin: number,
  rMax: number,
  rng: () => number,
  opts: PlacementOptions
): PlacementPoint[] {
  const worldRect = makeWorldRect(opts.worldWidth, opts.worldHeight)
  const out: PlacementPoint[] = []
  const baseStep = (2 * Math.PI) / Math.max(1, count)

  // Первый проход — равномерное распределение по углу
  for (let i = 0; i < count; i++) {
    const ang = i * baseStep + (rng() - 0.5) * (baseStep * 0.25)
    const r = rMin + (rMax - rMin) * rng()
    const x = cx + r * Math.cos(ang)
    const z = cz + r * Math.sin(ang)
    if (!isInsideRect(x, z, worldRect)) continue
    if (opts.area && !isInsideArea(opts.worldWidth, opts.worldHeight, x, z, opts.area)) continue
    out.push({ x, z })
  }

  // Добор пропусков случайными попытками
  let tries = 0
  const maxTries = Math.max(30, count * 10)
  while (out.length < count && tries < maxTries) {
    const ang = 2 * Math.PI * rng()
    const r = rMin + (rMax - rMin) * rng()
    const x = cx + r * Math.cos(ang)
    const z = cz + r * Math.sin(ang)
    tries++
    if (!isInsideRect(x, z, worldRect)) continue
    if (opts.area && !isInsideArea(opts.worldWidth, opts.worldHeight, x, z, opts.area)) continue
    out.push({ x, z })
  }

  return out
}
