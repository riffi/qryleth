import React from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SceneObjectInstance } from '@/entities/scene/types'

/**
 * Конфигурация LOD для деревьев.
 * nearDistance/farDistance — пороги гистерезиса по дистанции до камеры:
 *   - при dist > farDistance переключаемся на дальний LOD;
 *   - при dist < nearDistance возвращаемся на ближний LOD.
 *
 * farLeafSampleRatio — доля листьев для рендера в дальнем LOD (0..1),
 * farLeafScaleMul — доп. множитель масштаба листьев в дальнем LOD (компенсация редукции количества),
 * farTrunkRadialSegments/nearTrunkRadialSegments — сегментация ствола,
 * includeBranchesFar — включать ли ветви в дальнем LOD (по умолчанию — только ствол).
 */
export interface TreeLodConfig {
  nearDistance: number
  farDistance: number
  farLeafSampleRatio: number
  farLeafScaleMul: number
  nearTrunkRadialSegments: number
  farTrunkRadialSegments: number
  includeBranchesFar: boolean
  // Минимальная длительность удержания условия для переключения LOD (мс)
  switchDebounceMs?: number
  // Длительность плавного перехода между LOD (мс)
  fadeDurationMs?: number
}

/**
 * Базовые значения LOD, подобранные для сохранения визуальной похожести дерева в дальнем LOD.
 */
export const defaultTreeLodConfig: TreeLodConfig = {
  nearDistance: 50,
  farDistance: 70,
  farLeafSampleRatio: 0.4,
  farLeafScaleMul: 2.55,
  nearTrunkRadialSegments: 12,
  farTrunkRadialSegments: 8,
  includeBranchesFar: false,
  switchDebounceMs: 300,
  fadeDurationMs: 300,
}

/**
 * Хук LOD для одиночного инстанса дерева. Отслеживает расстояние до камеры
 * относительно мировой позиции объекта (groupRef) и с гистерезисом переключает
 * флаг дальнего LOD. Возвращает параметризацию для рендера.
 */
export function useSingleTreeLod(
  groupRef: React.RefObject<THREE.Object3D>,
  config?: Partial<TreeLodConfig>
) {
  const cfg = { ...defaultTreeLodConfig, ...(config || {}) }
  const [isFar, setIsFar] = React.useState(false)
  const [blend, setBlend] = React.useState(0) // 0..1
  const pendingSinceRef = React.useRef<number | null>(null)

  useFrame((state, delta) => {
    const camera = state.camera
    const g = groupRef.current
    if (!g) return
    const wp = new THREE.Vector3()
    g.getWorldPosition(wp)
    const dist = wp.distanceTo(camera.position)
    const desiredFar = isFar ? (dist > cfg.nearDistance) : (dist > cfg.farDistance)

    if (desiredFar !== isFar) {
      const now = performance.now()
      if (pendingSinceRef.current == null) pendingSinceRef.current = now
      const held = now - pendingSinceRef.current
      if ((cfg.switchDebounceMs || 0) <= 0 || held >= (cfg.switchDebounceMs || 0)) {
        setIsFar(desiredFar)
        pendingSinceRef.current = null
      }
    } else {
      pendingSinceRef.current = null
    }

    // Плавный фейд к целевому состоянию
    const target = isFar ? 1 : 0
    const durMs = Math.max(1, cfg.fadeDurationMs || 300)
    const step = delta * (1000 / durMs)
    if (Math.abs(blend - target) > 1e-3) {
      setBlend(prev => {
        let v = prev + (target > prev ? step : -step)
        if (target > prev) v = Math.min(target, v)
        else v = Math.max(target, v)
        return v
      })
    }
  })

  return {
    isFar,
    leafSampleRatio: isFar ? cfg.farLeafSampleRatio : undefined,
    leafScaleMul: isFar ? cfg.farLeafScaleMul : 1,
    trunkRadialSegments: isFar ? cfg.farTrunkRadialSegments : cfg.nearTrunkRadialSegments,
    includeBranchesInFar: cfg.includeBranchesFar,
    lodBlend: blend,
    config: cfg,
  }
}

/**
 * Хук LOD для массива инстансов одного объекта: делит инстансы на near/far
 * по расстоянию их локальной позиции (transform.position) до камеры.
 * Гистерезис удерживает состояние, чтобы наборы не «дрожали» при границе.
 */
export function usePartitionInstancesByLod(
  instances: SceneObjectInstance[],
  config?: Partial<TreeLodConfig>
) {
  const cfg = { ...defaultTreeLodConfig, ...(config || {}) }
  const [lodFarMap, setLodFarMap] = React.useState<Record<string, boolean>>({})
  const pendingSinceRef = React.useRef<Record<string, number>>({})
  const [nearInstances, setNearInstances] = React.useState<SceneObjectInstance[]>(instances)
  const [farInstances, setFarInstances] = React.useState<SceneObjectInstance[]>([])

  useFrame((state) => {
    const camera = state.camera
    let changed = false
    const nextMap: Record<string, boolean> = { ...lodFarMap }
    const nextNear: SceneObjectInstance[] = []
    const nextFar: SceneObjectInstance[] = []

    for (const inst of instances) {
      const id = inst.uuid
      const p = inst.transform?.position || [0, 0, 0]
      const dx = camera.position.x - p[0]
      const dy = camera.position.y - p[1]
      const dz = camera.position.z - p[2]
      const dist = Math.hypot(dx, dy, dz)
      const wasFar = !!lodFarMap[id]
      const desiredFar = wasFar ? (dist > cfg.nearDistance) : (dist > cfg.farDistance)

      if (desiredFar !== wasFar) {
        const now = performance.now()
        const since = pendingSinceRef.current[id] ?? now
        pendingSinceRef.current[id] = since
        if ((cfg.switchDebounceMs || 0) <= 0 || (now - since) >= (cfg.switchDebounceMs || 0)) {
          nextMap[id] = desiredFar
          changed = true
          pendingSinceRef.current[id] = now
        } else {
          nextMap[id] = wasFar
        }
      } else {
        pendingSinceRef.current[id] = performance.now()
        nextMap[id] = wasFar
      }

      if (nextMap[id]) nextFar.push(inst); else nextNear.push(inst)
    }

    if (
      changed ||
      nextNear.length !== nearInstances.length ||
      nextFar.length !== farInstances.length
    ) {
      setLodFarMap(nextMap)
      setNearInstances(nextNear)
      setFarInstances(nextFar)
    }
  })

  return {
    nearInstances,
    farInstances,
    leafSampleRatioFar: cfg.farLeafSampleRatio,
    leafScaleMulFar: cfg.farLeafScaleMul,
    trunkRadialSegmentsNear: cfg.nearTrunkRadialSegments,
    trunkRadialSegmentsFar: cfg.farTrunkRadialSegments,
    includeBranchesFar: cfg.includeBranchesFar,
    config: cfg,
  }
}
