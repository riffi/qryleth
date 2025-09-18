import { normalize as v3normalize } from '@/shared/lib/math/vector3'

/**
 * Находит ближайшую точку на ломаной (центральной оси ствола) к заданной точке p.
 * Возвращает индекс сегмента, параметр t (0..1) и собственно ближайшую точку.
 */
export function nearestOnCenterline(centers: [number, number, number][], p: [number, number, number]): { seg: number; t: number; point: [number, number, number] } {
  let best: { seg: number; t: number; point: [number, number, number]; d2: number } | null = null
  for (let i = 0; i < centers.length - 1; i++) {
    const a = centers[i], b = centers[i + 1]
    const ab: [number, number, number] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const ap: [number, number, number] = [p[0] - a[0], p[1] - a[1], p[2] - a[2]]
    const ab2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2]
    const t = ab2 > 1e-8 ? Math.min(1, Math.max(0, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / ab2)) : 0
    const q: [number, number, number] = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t]
    const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2]
    const d2 = dx * dx + dy * dy + dz * dz
    if (!best || d2 < best.d2) best = { seg: i, t, point: q, d2 }
  }
  return { seg: best!.seg, t: best!.t, point: best!.point }
}

/**
 * Быстрая оценка штрафа за «вход в ствол»: дискретно сэмплируем путь ветки
 * и сравниваем радиальное расстояние до оси Y с радиусом ствола на той высоте.
 * Если точка попадает внутрь ствола — добавляем большой штраф.
 */
export function trunkPathPenalty(
  trunkPath: { centers: [number, number, number][]; radii: number[] } | null,
  trunkHeight: number,
  trunkRadius: number,
  base: [number, number, number],
  dir: [number, number, number],
  len: number,
  rad: number,
): number {
  let penalty = 0
  const steps = 8
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = base[0] + dir[0] * (t * len)
    const y = base[1] + dir[1] * (t * len)
    const z = base[2] + dir[2] * (t * len)
    let rAt = 0.0
    if (trunkPath && trunkPath.centers.length >= 2) {
      const q = nearestOnCenterline(trunkPath.centers, [x, y, z])
      const r0 = trunkPath.radii[q.seg]
      const r1 = trunkPath.radii[q.seg + 1] ?? r0
      rAt = Math.max(0.02, r0 * (1 - q.t) + r1 * q.t)
    } else {
      if (y < 0 || y > trunkHeight) continue
      const ratio = Math.min(Math.max(y / Math.max(1e-4, trunkHeight), 0), 1)
      rAt = Math.max(0.02, trunkRadius * (1 - 0.4 * ratio))
    }
    const distAxis = trunkPath ? Math.hypot(x - (nearestOnCenterline(trunkPath.centers, [x, y, z]).point[0]), z - (nearestOnCenterline(trunkPath.centers, [x, y, z]).point[2])) : Math.hypot(x, z)
    const pen = (rAt + rad) - distAxis
    if (pen > 0) penalty += pen * 1000
    else penalty += Math.max(0, -pen) * 0.1
  }
  return penalty
}

/**
 * Эвристика «направления наружу»: штрафует направления, идущие не радиально
 * от оси ствола (в XZ‑плоскости). Чем меньше проекция на радиальный вектор, тем больше штраф.
 */
export function outwardPenalty(base: [number, number, number], dir: [number, number, number], trunkPath?: { centers: [number, number, number][] }): number {
  let radial: [number, number, number]
  if (trunkPath && trunkPath.centers.length >= 1) {
    const q = nearestOnCenterline(trunkPath.centers, base)
    const v: [number, number, number] = [base[0] - q.point[0], 0, base[2] - q.point[2]]
    const vlen = Math.hypot(v[0], v[2])
    radial = vlen < 1e-6 ? [1, 0, 0] : [v[0] / vlen, 0, v[2] / vlen]
  } else {
    const n = v3normalize([base[0], 0, base[2]])
    radial = n
  }
  const dirXZLen = Math.hypot(dir[0], dir[2])
  if (dirXZLen < 1e-6) return 10
  const dirXZ: [number, number, number] = [dir[0] / dirXZLen, 0, dir[2] / dirXZLen]
  const d = radial[0] * dirXZ[0] + radial[2] * dirXZ[2]
  return (1 - Math.max(0, d)) * 2
}

/**
 * Расстояние между двумя отрезками в 3D, возвращает также параметры ближайших точек.
 * Удобно для быстрого отсечения коллизий соседних ветвей.
 */
export function segmentDistance(
  a0: [number, number, number], a1: [number, number, number],
  b0: [number, number, number], b1: [number, number, number],
): { dist: number, u: number, v: number } {
  const ax = a0[0], ay = a0[1], az = a0[2]
  const bx = b0[0], by = b0[1], bz = b0[2]
  const u1x = a1[0] - ax, u1y = a1[1] - ay, u1z = a1[2] - az
  const u2x = b1[0] - bx, u2y = b1[1] - by, u2z = b1[2] - bz

  const rx = ax - bx, ry = ay - by, rz = az - bz
  const a = u1x * u1x + u1y * u1y + u1z * u1z
  const e = u2x * u2x + u2y * u2y + u2z * u2z
  const f = u2x * rx + u2y * ry + u2z * rz

  let s = 0, t = 0

  if (a <= 1e-9 && e <= 1e-9) {
    const dx = ax - bx, dy = ay - by, dz = az - bz
    return { dist: Math.hypot(dx, dy, dz), u: 0, v: 0 }
  }
  if (a <= 1e-9) {
    t = Math.min(1, Math.max(0, f / e))
  } else {
    const c = u1x * rx + u1y * ry + u1z * rz
    if (e <= 1e-9) {
      s = Math.min(1, Math.max(0, -c / a))
    } else {
      const b = u1x * u2x + u1y * u2y + u1z * u2z
      const denom = a * e - b * b
      if (denom !== 0) s = Math.min(1, Math.max(0, (b * f - c * e) / denom))
      else s = 0
      t = (b * s + f) / e
      if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -c / a)) }
      else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - c) / a)) }
    }
  }

  const px = ax + u1x * s, py = ay + u1y * s, pz = az + u1z * s
  const qx = bx + u2x * t, qy = by + u2y * t, qz = bz + u2z * t
  const dx = px - qx, dy = py - qy, dz = pz - qz
  return { dist: Math.hypot(dx, dy, dz), u: s, v: t }
}

