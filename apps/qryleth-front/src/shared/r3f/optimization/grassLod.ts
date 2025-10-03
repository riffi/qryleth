import React from 'react'
import * as THREE from 'three'
import type { SceneObjectInstance } from '@/entities/scene/types'
import { useFrame } from '@react-three/fiber'

export interface GrassLodConfig {
  enabled?: boolean
  /** Порог гистерезиса: при Spx ≥ nearInPx возвращаемся к Near */
  nearInPx: number
  /** Порог гистерезиса: при Spx ≤ nearOutPx уходим в Far */
  nearOutPx: number
  /** Приблизительная мировая высота пучка травы (м), для оценки Spx */
  approximateGrassHeightWorld?: number
  /** Минимальная величина в пикселях для избежания деления на ноль */
  epsilonPx?: number
}

/**
 * Хук разделения инстансов травы на Near/Far по экранной высоте (Spx в пикселях).
 * Только два уровня LOD: Near и Far (LOD2 трипланар). Билборда (LOD3) нет.
 * Использует гистерезис на порогах nearIn/nearOut: nearIn > nearOut.
 */
export function usePartitionGrassByLod(
  instances: SceneObjectInstance[],
  config: GrassLodConfig
) {
  const cfg = React.useMemo(() => ({ epsilonPx: 1, approximateGrassHeightWorld: 1, enabled: true, ...(config || {}) }), [config])
  const [nearSolid, setNearSolid] = React.useState<SceneObjectInstance[]>(instances)
  const [farSolid, setFarSolid] = React.useState<SceneObjectInstance[]>([])
  const prevClassRef = React.useRef<Record<string, 'near' | 'far'>>({})
  const frameCountRef = React.useRef(0)

  useFrame((state) => {
    frameCountRef.current++
    if (cfg.enabled === false) {
      if (nearSolid.length !== instances.length) setNearSolid(instances)
      if (farSolid.length !== 0) setFarSolid([])
      return
    }

    const camera = state.camera as THREE.PerspectiveCamera
    const Hpx = state.size.height
    const fovRad = (camera.fov ?? 60) * Math.PI / 180
    const projK = Hpx / (2 * Math.tan(fovRad * 0.5))
    const epsPx = Math.max(1e-3, cfg.epsilonPx || 1)
    const Hworld = Math.max(0.1, cfg.approximateGrassHeightWorld || 1)
    const toDist = (px?: number) => px && px > 0 ? (1 / Math.max(px, epsPx)) : undefined
    const nearInD = toDist(cfg.nearInPx)
    const nearOutD = toDist(cfg.nearOutPx)

    const nextNear: SceneObjectInstance[] = []
    const nextFar: SceneObjectInstance[] = []

    const objPos = new THREE.Vector3()
    const camPos = new THREE.Vector3()
    camera.getWorldPosition(camPos)

    for (const inst of instances) {
      const p = inst.transform?.position || [0,0,0]
      objPos.set(p[0], p[1], p[2])
      const d = Math.max(0.001, objPos.distanceTo(camPos))
      const Spx = Hworld * (projK / d)
      const dist = 1 / Math.max(Spx, epsPx)

      let stable: 'near' | 'far' = prevClassRef.current[inst.uuid] || 'near'
      if (nearInD && nearOutD) {
        if (stable === 'near') {
          if (dist >= (nearOutD || 0)) stable = 'far'
        } else { // far
          if (dist <= (nearInD || 0)) stable = 'near'
        }
      } else {
        // Если пороги не заданы — всё считаем Near
        stable = 'near'
      }
      prevClassRef.current[inst.uuid] = stable
      if (stable === 'near') nextNear.push(inst); else nextFar.push(inst)
    }

    const sig = (arr: SceneObjectInstance[]) => arr.map(x => x.uuid).join('|')
    const sNear = sig(nextNear)
    const sFar = sig(nextFar)
    if (sNear !== nearSolid.map(x=>x.uuid).join('|')) setNearSolid(nextNear)
    if (sFar !== farSolid.map(x=>x.uuid).join('|')) setFarSolid(nextFar)
  })

  return { nearSolid, farSolid }
}

