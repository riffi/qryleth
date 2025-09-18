import * as THREE from 'three'
import { degToRad } from '@/shared/lib/math/number'
import type { TreeGeneratorParams } from '../types'
import { eulerFromDir } from './curves'

/**
 * Вычисляет ориентацию листа в виде эйлеровых углов.
 *
 * Поведение:
 * - shape = 'texture': плоский лист ориентируется так, чтобы его нормаль z
 *   была между радиальным вектором цилиндра (radial) и осью (axisN) на угол phi.
 *   Затем применяется глобальный наклон к мировой оси Y/−Y в плоскости листа.
 * - shape ≠ 'texture' (billboard/сфера): используем направление facingDir и добавляем случайный roll.
 *
 * Параметры наклона берутся из TreeGeneratorParams: leafTiltDeg, leafGlobalTiltMode/Level.
 */
export function computeLeafEuler(
  axisN: [number, number, number],
  radial: THREE.Vector3,
  params: TreeGeneratorParams,
  rng: () => number,
  facingDir: [number, number, number],
): [number, number, number] {
  const isTexture = (params.leafShape || 'billboard') === 'texture'
  if (!isTexture) {
    const roll = (rng() - 0.5) * Math.PI
    const e = eulerFromDir(facingDir)
    return [e[0], e[1], e[2] + roll]
  }

  const r = radial.clone().normalize()
  const t = new THREE.Vector3(...axisN).normalize()
  const phi = degToRad(Math.max(0, Math.min(90, (params.leafTiltDeg ?? 25))))
  // Нормаль листа в сторону между r и t
  let z = r.clone().multiplyScalar(Math.cos(phi)).add(t.clone().multiplyScalar(Math.sin(phi))).normalize()
  // Базис в плоскости
  let x = new THREE.Vector3().crossVectors(t, z)
  if (x.lengthSq() < 1e-10) x = new THREE.Vector3().crossVectors(r, z)
  x.normalize()
  let yAxis = new THREE.Vector3().crossVectors(z, x).normalize()
  // Глобальный наклон вверх/вниз в плоскости листа
  {
    const mode = (params.leafGlobalTiltMode || 'none') as 'up' | 'down' | 'none'
    const level = Math.max(0, Math.min(1, params.leafGlobalTiltLevel ?? 0))
    if (mode !== 'none' && level > 0) {
      const target = mode === 'up' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, -1, 0)
      const yProj = target.clone().sub(z.clone().multiplyScalar(target.dot(z)))
      if (yProj.lengthSq() > 1e-12 && yAxis.lengthSq() > 1e-12) {
        const yProjN = yProj.clone().normalize()
        const dotY = Math.max(-1, Math.min(1, yAxis.dot(yProjN)))
        const ang = Math.acos(dotY)
        if (ang > 1e-5) {
          const s = Math.sign(new THREE.Vector3().crossVectors(yAxis, yProjN).dot(z)) || 1
          const rotAng = ang * level * s
          const q = new THREE.Quaternion().setFromAxisAngle(z, rotAng)
          x = x.applyQuaternion(q).normalize()
          yAxis = yAxis.applyQuaternion(q).normalize()
        }
      }
    }
  }
  // Гарантируем «вовне» при отсутствии глобального наклона
  if ((params.leafGlobalTiltLevel ?? 0) <= 0 && z.dot(r) < 0) z.multiplyScalar(-1)
  const e = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, yAxis, z), 'XYZ')
  return [e.x, e.y, e.z]
}

/**
 * Выбор имени спрайта листвы в текстурном режиме.
 * Если включён режим useAllLeafSprites и задан список имён — берёт детерминированно случайный из списка.
 * Иначе — возвращает одиночное имя из params.leafTextureSpriteName (или undefined).
 */
export function selectLeafSprite(params: TreeGeneratorParams, rng: () => number): string | undefined {
  if ((params.leafShape || 'billboard') !== 'texture') return undefined
  if (params.useAllLeafSprites && Array.isArray(params.leafSpriteNames) && params.leafSpriteNames.length > 0) {
    const names = params.leafSpriteNames
    const idx = Math.floor(rng() * names.length) % names.length
    return names[idx]
  }
  return params.leafTextureSpriteName || undefined
}

