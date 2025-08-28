import type { GfxTerrainOp } from '@/entities/terrain'

/**
 * Применяет массив операций модификации к базовой высоте с использованием
 * оптимизации через предварительно выбранный список релевантных операций.
 *
 * @param baseHeight — базовая высота из источника
 * @param x — мировая X
 * @param z — мировая Z
 * @param ops — список потенциально влияющих операций
 * @returns модифицированная высота
 */
export function applyTerrainOpsOptimized(
  baseHeight: number,
  x: number,
  z: number,
  ops: GfxTerrainOp[]
): number {
  let height = baseHeight
  for (const op of ops) {
    const contribution = calculateOpContribution(op, x, z)
    if (contribution === 0) continue
    switch (op.mode) {
      case 'add':
        height += contribution
        break
      case 'sub':
        height -= contribution
        break
      case 'set':
        height = baseHeight + contribution
        break
    }
  }
  return height
}

/**
 * Вычисляет вклад одной операции в точке. Если точка лежит за пределами
 * области влияния (нормализованное расстояние ≥ 1), вклад равен 0.
 */
export function calculateOpContribution(op: GfxTerrainOp, x: number, z: number): number {
  const t = calculateOpDistance(op, x, z)
  if (t >= 1) return 0
  const f = applyFalloffFunction(1 - t, op.falloff || 'smoothstep', op.flatInner)
  return op.intensity * f
}

/**
 * Возвращает нормализованное расстояние с учётом эллиптических радиусов и поворота.
 * 0 — центр операции, 1 — граница влияния (и более — вне влияния).
 */
export function calculateOpDistance(op: GfxTerrainOp, x: number, z: number): number {
  let dx = x - op.center[0]
  let dz = z - op.center[1]
  if (op.rotation && op.rotation !== 0) {
    const cos = Math.cos(-op.rotation)
    const sin = Math.sin(-op.rotation)
    const rdx = dx * cos - dz * sin
    const rdz = dx * sin + dz * cos
    dx = rdx
    dz = rdz
  }
  const rx = op.radius
  const rz = op.radiusZ || op.radius
  if (op.shape === 'rect') {
    // Прямоугольник: нормализованная дистанция — максимум из проекций по осям
    const nx = Math.abs(dx) / rx
    const nz = Math.abs(dz) / rz
    return Math.max(nx, nz)
  } else {
    // Эллипс по умолчанию
    const nx = dx / rx
    const nz = dz / rz
    return Math.sqrt(nx * nx + nz * nz)
  }
}

/**
 * Функции затухания по нормализованной близости t (0..1), где t=1 — центр фигуры, t=0 — край.
 * - linear: f(t)=t
 * - smoothstep: f(t)=t^2 (3-2t)
 * - gauss: exp(-3 * (1-t)^2)
 * - plateau: плоское ядро долей радиуса flatInner (0..1), далее плавный спад к краю
 */
export function applyFalloffFunction(
  t: number,
  falloff: 'smoothstep' | 'gauss' | 'linear' | 'plateau',
  flatInner?: number,
): number {
  const tt = Math.max(0, Math.min(1, t))
  switch (falloff) {
    case 'linear':
      return tt
    case 'smoothstep':
      return tt * tt * (3 - 2 * tt)
    case 'gauss': {
      const g = 1 - tt
      return Math.exp(-3 * g * g)
    }
    case 'plateau': {
      // Интерпретация flatInner как ДОЛИ плоского ядра по радиусу (0..1):
      // flatInner=1 — полностью плоско до самого края; flatInner=0 — плоского ядра нет.
      // В терминах близости t (1 — центр, 0 — край) порог насыщения равен C0 = 1 - flatInner.
      // При t >= C0 — значение 1 (плоское ядро), ниже — плавный спад к 0 у края.
      const p = Math.max(0, Math.min(1, flatInner ?? 0.3)) // доля плоского ядра по радиусу
      const c0 = 1 - p // порог по близости, начиная с которого функция насыщена (=1)
      if (tt >= c0) return 1
      if (c0 <= 0) return 1 // защита на случай p=1 (полностью плоско)
      const s = tt / c0 // нормируем полосу [0..c0] в [0..1]
      // Плавный спад (smoothstep) в полосе от края к плоскому ядру
      return s * s * (3 - 2 * s)
    }
    default:
      return tt * tt * (3 - 2 * tt)
  }
}
