/**
 * Вычисляет коэффициент плавного затухания высоты к краям террейна.
 *
 * Идея: расстояние до ближайшего края (в долях от размера) делится на
 * параметр edgeFade (доля от края, где происходит затухание). В центре — 1,
 * на самом краю — 0.
 *
 * @param x — мировая координата X
 * @param z — мировая координата Z
 * @param worldWidth — ширина мира по X
 * @param worldHeight — ширина мира по Z
 * @param edgeFade — доля от края для затухания (0..1)
 * @returns множитель [0..1]
 */
export function calculateEdgeFade(
  x: number,
  z: number,
  worldWidth: number,
  worldHeight: number,
  edgeFade: number
): number {
  const halfW = worldWidth / 2
  const halfH = worldHeight / 2
  const distLeft = (x + halfW) / worldWidth
  const distRight = (halfW - x) / worldWidth
  const distTop = (z + halfH) / worldHeight
  const distBottom = (halfH - z) / worldHeight
  const edgeDistance = Math.min(distLeft, distRight, distTop, distBottom)
  const fade = Math.max(0, Math.min(1, edgeDistance / edgeFade))
  return fade
}

