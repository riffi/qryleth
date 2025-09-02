/**
 * Преобразование мировых координат террейна в UV-координаты [0..1].
 *
 * @param x — мировая координата X
 * @param z — мировая координата Z
 * @param worldWidth — ширина мира по X
 * @param worldDepth — глубина мира по Z
 * @returns кортеж [u, v] без учета wrap (повтор/обрезка применяется отдельно)
 */
export function worldToUV(
  x: number,
  z: number,
  worldWidth: number,
  worldDepth: number
): [number, number] {
  const halfW = worldWidth / 2
  const halfH = worldDepth / 2
  const u = (x + halfW) / worldWidth
  const v = (z + halfH) / worldDepth
  return [u, v]
}

/**
 * Применяет стратегию обработки краев UV-координат: clamp или repeat.
 *
 * - clamp: ограничивает значения в диапазоне [0..1]
 * - repeat: оставляет дробную часть, корректируя отрицательные значения
 *
 * @param u — UV по X
 * @param v — UV по Y
 * @param mode — режим обработки краев: 'clamp' | 'repeat'
 * @returns нормализованные UV-координаты [u, v]
 */
export function applyWrap(
  u: number,
  v: number,
  mode: 'clamp' | 'repeat'
): [number, number] {
  switch (mode) {
    case 'repeat': {
      let uu = u - Math.floor(u)
      let vv = v - Math.floor(v)
      if (uu < 0) uu += 1
      if (vv < 0) vv += 1
      return [uu, vv]
    }
    case 'clamp':
    default:
      return [Math.max(0, Math.min(1, u)), Math.max(0, Math.min(1, v))]
  }
}
