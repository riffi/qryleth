import type { Vector3 } from '@/shared/types'
import { normalize as v3normalize, length as v3length } from '@/shared/lib/math/vector3'

/**
 * Ограничивает наклон нормали относительно вертикали (оси Y) в пропорции,
 * чтобы 90° соответствовало maxTiltRad, а 0° — 0. Сохраняет направление наклона
 * (по XZ) и «полушарие» (знак Y) исходной нормали.
 *
 * Используется для «мягкого» автоповорота объектов по нормали поверхности,
 * избегая жёстких ограничений и упора в максимальный угол.
 * @param normal — исходная нормаль [x,y,z]
 * @param maxTiltRad — максимальный наклон в радианах (при 90° исходной нормали)
 */
export function limitNormalByMaxTilt(normal: Vector3, maxTiltRad: number): Vector3 {
  const len0 = v3length(normal)
  if (len0 <= 1e-8) return [0, 1, 0]
  const [nx, ny, nz] = v3normalize(normal)

  // Угол до оси Y (0..90°), независимо от полушария
  const angle = Math.acos(Math.max(-1, Math.min(1, Math.abs(ny))))

  // Сохраняем исходное полушарие (вверх/вниз)
  const signY = ny >= 0 ? 1 : -1

  // Направление наклона — проекция на XZ
  const hx0 = nx
  const hz0 = nz
  const hlen = Math.hypot(hx0, hz0)
  let hx = 0, hz = 1
  if (hlen > 1e-8) {
    hx = hx0 / hlen
    hz = hz0 / hlen
  }

  // Линеарное масштабирование угла: 0..90° -> 0..maxTiltRad
  const k = maxTiltRad / (Math.PI / 2)
  const mapped = angle * k

  const y = signY * Math.cos(mapped)
  const s = Math.sin(mapped)
  const x = hx * s
  const z = hz * s
  return [x, y, z]
}

/**
 * Преобразует нормаль поверхности в углы Эйлера [rx, ry, rz] (в радианах),
 * выравнивая ось Y объекта по нормали. Азимут (ry) фиксируется равным 0 —
 * управляем только наклонами вокруг X и Z.
 * @param normal — нормаль поверхности [x,y,z]
 * @param maxTiltRad — необязательный предел наклона в радианах
 * @returns [rx, ry=0, rz] — углы поворота
 */
export function normalToRotation(normal: Vector3, maxTiltRad?: number): Vector3 {
  const [x, y, z] = typeof maxTiltRad === 'number' ? limitNormalByMaxTilt(normal, maxTiltRad) : v3normalize(normal)
  const rx = Math.atan2(z, y)
  const rz = Math.atan2(x, y)
  const ry = 0
  return [rx, ry, rz]
}

