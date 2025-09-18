import * as THREE from 'three'
import { degToRad, smoothstep, clamp } from '@/shared/lib/math/number'

/**
 * Строит ориентиры (ортонормальный базис) вокруг заданной оси.
 * Возвращает пару векторов, перпендикулярных оси: o1, o2.
 * Используется для построения поперечных направлений относительно оси ветви/ствола.
 */
export function orthonormalBasis(axis: THREE.Vector3): { o1: THREE.Vector3; o2: THREE.Vector3 } {
  const tmp = Math.abs(axis.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
  const o1 = new THREE.Vector3().crossVectors(axis, tmp).normalize()
  const o2 = new THREE.Vector3().crossVectors(axis, o1).normalize()
  return { o1, o2 }
}

/**
 * Создаёт 3–4 контрольные точки кривой для ветви с небольшим «провисанием» вниз
 * и боковым джиттером. Начальная точка совпадает с местом крепления.
 *
 * @param baseInside — точка крепления ветви в мировых координатах
 * @param nDir — нормализованное направление роста ветви
 * @param len — длина ветви
 * @param rng — детерминированный PRNG [0,1)
 * @param bendBase — базовый уровень изгиба вниз (0..1)
 * @param bendJitter — уровень бокового джиттера (0..1)
 */
export function buildBranchCurvePoints(
  baseInside: [number, number, number],
  nDir: [number, number, number],
  len: number,
  rng: () => number,
  bendBase?: number,
  bendJitter?: number,
): THREE.Vector3[] {
  const axis = new THREE.Vector3(nDir[0], nDir[1], nDir[2]).normalize()
  const { o1, o2 } = orthonormalBasis(axis)

  // Степень «провиса» вниз зависит от угла к вертикали и bendBase
  const up = clamp(axis.y, 0, 1)
  const styr = clamp(bendBase ?? 0.5, 0, 1)
  const droopBase = (1 - up) * 0.12 * (0.2 + 1.8 * styr)

  const jitterLevel = clamp(bendJitter ?? 0.4, 0, 1)
  const lateralAmp = 0.04 * len * (0.2 + 1.8 * jitterLevel)
  const jitter = (amp: number) => {
    const a = (rng() * 2 - 1) * amp
    const b = (rng() * 2 - 1) * amp
    return new THREE.Vector3().addScaledVector(o1, a).addScaledVector(o2, b)
  }

  const P0 = new THREE.Vector3(baseInside[0], baseInside[1], baseInside[2])
  const P1 = new THREE.Vector3().copy(P0).addScaledVector(axis, 0.32 * len)
    .add(new THREE.Vector3(0, -droopBase * len * (0.25 + 0.5 * jitterLevel * rng()), 0))
    .add(jitter(lateralAmp * 0.25))
  const P2 = new THREE.Vector3().copy(P0).addScaledVector(axis, 0.66 * len)
    .add(new THREE.Vector3(0, -droopBase * len * (0.55 + 0.7 * jitterLevel * rng()), 0))
    .add(jitter(lateralAmp * 0.5))
  const P3 = new THREE.Vector3().copy(P0).addScaledVector(axis, 1.00 * len)
    .add(new THREE.Vector3(0, -droopBase * len * (0.85 + 0.3 * jitterLevel * rng()), 0))
    .add(jitter(lateralAmp * 0.3))

  return [P0, P1, P2, P3]
}

/**
 * Создаёт контрольные точки для кривой ствола по высоте с мягким боковым изгибом.
 * Без «провиса» по -Y. Сила изгиба масштабируется shearStrength и randomness.
 */
export function buildTrunkCurvePoints(
  height: number,
  shearStrength: number | undefined,
  rng: () => number,
  randomness: number | undefined,
): THREE.Vector3[] {
  const s = clamp(shearStrength ?? 0, 0, 1)
  const rnd = clamp(randomness ?? 0.3, 0, 1)
  const up = new THREE.Vector3(0, 1, 0)
  const phi = rng() * Math.PI * 2
  const side = new THREE.Vector3(Math.cos(phi), 0, Math.sin(phi))
  const side2 = new THREE.Vector3(-Math.sin(phi), 0, Math.cos(phi))
  const amp = height * (0.04 + 0.08 * s) * (0.7 + 0.6 * rnd)
  const jitter = (k: number) => side.clone().multiplyScalar(amp * k * (0.6 + 0.8 * (rng() - 0.5)))
    .add(side2.clone().multiplyScalar(amp * k * (rng() - 0.5) * 0.5))

  const P0 = new THREE.Vector3(0, 0, 0)
  const P1 = new THREE.Vector3().copy(P0).addScaledVector(up, height * 0.33).add(jitter(0.4))
  const P2 = new THREE.Vector3().copy(P0).addScaledVector(up, height * 0.66).add(jitter(0.6))
  const P3 = new THREE.Vector3().copy(P0).addScaledVector(up, height * 1.00).add(jitter(0.3))
  return [P0, P1, P2, P3]
}

/**
 * Вычисляет углы Эйлера для поворота оси Y в заданное направление dir.
 * Используется для грубой ориентации объектов (например, сферических листьев).
 */
export function eulerFromDir(dir: [number, number, number]): [number, number, number] {
  const vFrom = new THREE.Vector3(0, 1, 0)
  const vTo = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize()
  const q = new THREE.Quaternion().setFromUnitVectors(vFrom, vTo)
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ')
  return [e.x, e.y, e.z]
}

/**
 * Вычисляет требуемый угол «кручения» (roll) вокруг оси axisN, чтобы нормаль плоскости листа
 * совпала с заданным радиальным направлением radial. Используется для листьев-текстур.
 */
export function computeRollToAlignNormal(axisN: [number, number, number], radial: THREE.Vector3): number {
  const axis = new THREE.Vector3(axisN[0], axisN[1], axisN[2]).normalize()
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis)
  const normal0 = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize()
  const target = radial.clone().normalize()
  const proj = (v: THREE.Vector3) => v.clone().sub(axis.clone().multiplyScalar(v.dot(axis)))
  const a = proj(normal0).normalize()
  const b = proj(target).normalize()
  const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1)
  let angle = Math.acos(dot)
  const cross = new THREE.Vector3().crossVectors(a, b)
  const sign = Math.sign(cross.dot(axis)) || 1
  angle *= sign
  return angle
}

