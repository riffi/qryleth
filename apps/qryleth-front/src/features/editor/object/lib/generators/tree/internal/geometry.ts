/**
 * Геометрические утилиты для конфигурации ствола/ветвей: taper/радиусы/воротник.
 */

/**
 * Радиус ствола на нормализованной высоте t∈[0..1] с учётом taperFactor (0..1).
 * Минимальный радиус зажат к 0.02 для стабильной геометрии.
 */
export function trunkRadiusAt01(baseRadius: number, t: number, taperFactor: number | undefined): number {
  const k = Math.max(0, Math.min(1, taperFactor ?? 0.4))
  return Math.max(0.02, baseRadius * (1 - k * Math.max(0, Math.min(1, t))))
}

/**
 * Линейное сужение ветви к кончику: r(t) = r0 * (1 - tipTaper * t).
 * Возвращает функцию taper(t) для передачи в билдер трубки.
 */
export function linearTaper(tipTaper: number): (t: number) => number {
  const k = Math.max(0, Math.min(0.95, tipTaper))
  return (t: number) => 1 - k * t
}

