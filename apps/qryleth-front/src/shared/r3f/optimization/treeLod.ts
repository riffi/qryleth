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
  // Порог дистанции для LOD3 (билборд дерева)
  billboardDistance: number
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
  nearDistance: 20,
  farDistance: 40,
  billboardDistance: 80,
  farLeafSampleRatio: 0.4,
  farLeafScaleMul: 2,
  nearTrunkRadialSegments: 12,
  farTrunkRadialSegments: 8,
  includeBranchesFar: false,
  switchDebounceMs: 300,
  fadeDurationMs: 300,
}

// Кешируем векторы для переиспользования
const _worldPos = new THREE.Vector3()
const _cameraPos = new THREE.Vector3()

/**
 * Хук LOD для одиночного инстанса дерева. Отслеживает расстояние до камеры
 * относительно мировой позиции объекта (groupRef) и с гистерезисом переключает
 * флаг дальнего LOD. Возвращает параметризацию для рендера.
 */
export function useSingleTreeLod(
    groupRef: React.RefObject<THREE.Object3D>,
    config?: Partial<TreeLodConfig>
) {
  const cfg = React.useMemo(() => ({ ...defaultTreeLodConfig, ...(config || {}) }), [config])
  const [lodLevel, setLodLevel] = React.useState<0 | 2 | 3>(0)
  const [blend, setBlend] = React.useState(0) // 0..1
  const pendingSinceRef = React.useRef<number | null>(null)
  const lastDistRef = React.useRef<number>(0)
  const frameCountRef = React.useRef(0)

  useFrame((state, delta) => {
    const g = groupRef.current
    if (!g) return

    // Проверяем расстояние каждый 3-й кадр для экономии производительности
    frameCountRef.current++
    if (frameCountRef.current % 3 !== 0 && Math.abs(blend - (isFar ? 1 : 0)) < 0.01) {
      return
    }

    const camera = state.camera
    g.getWorldPosition(_worldPos)
    _cameraPos.copy(camera.position)
    const dist = _worldPos.distanceToSquared(_cameraPos) // Используем квадрат расстояния для скорости

    // Кеширование: пропускаем если изменение < 1%
    const distSqrt = Math.sqrt(dist)
    if (Math.abs(distSqrt - lastDistRef.current) < lastDistRef.current * 0.01) {
      return
    }
    lastDistRef.current = distSqrt

    // Используем квадраты порогов для сравнения
    const nearThresholdSq = cfg.nearDistance * cfg.nearDistance
    const farThresholdSq = cfg.farDistance * cfg.farDistance
    const billboardThresholdSq = cfg.billboardDistance * cfg.billboardDistance
    const desiredLevel: 0 | 2 | 3 = (dist > billboardThresholdSq) ? 3 : (dist > farThresholdSq ? 2 : 0)
    const wasLevel = lodLevel

    if (desiredLevel !== wasLevel) {
      const now = performance.now()
      if (pendingSinceRef.current == null) {
        pendingSinceRef.current = now
      }
      const held = now - pendingSinceRef.current
      if ((cfg.switchDebounceMs || 0) <= 0 || held >= (cfg.switchDebounceMs || 0)) {
        setLodLevel(desiredLevel)
        pendingSinceRef.current = null
      }
    } else {
      pendingSinceRef.current = null
    }

    // Плавный фейд к целевому состоянию
    // Для совместимости оставляем blend как индикатор перехода 0↔2.
    const target = lodLevel === 2 ? 1 : 0
    if (Math.abs(blend - target) > 0.001) {
      const durMs = Math.max(1, cfg.fadeDurationMs || 300)
      const step = delta * (1000 / durMs)
      setBlend(prev => {
        const diff = target - prev
        const absDiff = Math.abs(diff)
        if (absDiff < 0.001) return target
        // Используем easing для более плавного перехода
        const easedStep = step * (2 - absDiff) // Замедление к концу
        return prev + Math.sign(diff) * Math.min(absDiff, easedStep)
      })
    }
  })

  return React.useMemo(() => ({
    lodLevel,
    isFar: lodLevel === 2,
    isBillboard: lodLevel === 3,
    leafSampleRatio: lodLevel === 2 ? cfg.farLeafSampleRatio : undefined,
    leafScaleMul: lodLevel === 2 ? cfg.farLeafScaleMul : 1,
    trunkRadialSegments: lodLevel === 2 ? cfg.farTrunkRadialSegments : cfg.nearTrunkRadialSegments,
    includeBranchesInFar: cfg.includeBranchesFar,
    lodBlend: blend,
    config: cfg,
  }), [lodLevel, blend, cfg])
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
  const cfg = React.useMemo(() => ({ ...defaultTreeLodConfig, ...(config || {}) }), [config])
  const [lodLevelMap, setLodLevelMap] = React.useState<Record<string, 0 | 2 | 3>>(() => ({}))
  const pendingSinceRef = React.useRef<Record<string, number>>({})
  const [nearInstances, setNearInstances] = React.useState<SceneObjectInstance[]>(instances)
  const [farInstances, setFarInstances] = React.useState<SceneObjectInstance[]>([])
  const [billboardInstances, setBillboardInstances] = React.useState<SceneObjectInstance[]>([])
  const frameCountRef = React.useRef(0)
  const lastCameraPosRef = React.useRef(new THREE.Vector3())

  // Предварительные вычисления квадратов порогов
  const nearThresholdSq = React.useMemo(() => cfg.nearDistance * cfg.nearDistance, [cfg.nearDistance])
  const farThresholdSq = React.useMemo(() => cfg.farDistance * cfg.farDistance, [cfg.farDistance])
  const billboardThresholdSq = React.useMemo(() => cfg.billboardDistance * cfg.billboardDistance, [cfg.billboardDistance])

  useFrame((state) => {
    const camera = state.camera

    // Проверяем изменение позиции камеры
    const cameraMoved = camera.position.distanceToSquared(lastCameraPosRef.current) > 0.01

    // Обновляем каждый 5-й кадр или при движении камеры
    frameCountRef.current++
    if (!cameraMoved && frameCountRef.current % 5 !== 0) {
      return
    }

    if (cameraMoved) {
      lastCameraPosRef.current.copy(camera.position)
    }

    let changed = false
    const nextMap: Record<string, 0 | 2 | 3> = {}
    const nextNear: SceneObjectInstance[] = []
    const nextFar: SceneObjectInstance[] = []
    const nextBillboard: SceneObjectInstance[] = []
    const now = performance.now()
    const camX = camera.position.x
    const camY = camera.position.y
    const camZ = camera.position.z

    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i]
      const id = inst.uuid
      const p = inst.transform?.position
      if (!p) {
        nextNear.push(inst)
        continue
      }

      // Вычисляем квадрат расстояния напрямую
      const dx = camX - p[0]
      const dy = camY - p[1]
      const dz = camZ - p[2]
      const distSq = dx * dx + dy * dy + dz * dz

      const wasLevel = lodLevelMap[id] ?? 0
      const thresholdSq = wasLevel === 3 ? billboardThresholdSq : wasLevel === 2 ? nearThresholdSq : farThresholdSq
      const desiredLevel: 0 | 2 | 3 = (distSq > billboardThresholdSq) ? 3 : (distSq > farThresholdSq ? 2 : 0)

      if (desiredLevel !== wasLevel) {
        const since = pendingSinceRef.current[id] || now
        if (pendingSinceRef.current[id] === undefined) {
          pendingSinceRef.current[id] = now
        }

        if ((cfg.switchDebounceMs || 0) <= 0 || (now - since) >= (cfg.switchDebounceMs || 0)) {
          nextMap[id] = desiredLevel
          changed = true
          delete pendingSinceRef.current[id]
        } else {
          nextMap[id] = wasLevel
        }
      } else {
        delete pendingSinceRef.current[id]
        nextMap[id] = wasLevel
      }

      const level = nextMap[id]
      if (level === 3) nextBillboard.push(inst)
      else if (level === 2) nextFar.push(inst)
      else nextNear.push(inst)
    }

    // Обновляем состояние только если есть изменения
    if (changed) {
      setLodLevelMap(nextMap)
      setNearInstances(nextNear)
      setFarInstances(nextFar)
      setBillboardInstances(nextBillboard)
    }
  })

  return React.useMemo(() => ({
    nearInstances,
    farInstances,
    billboardInstances,
    leafSampleRatioFar: cfg.farLeafSampleRatio,
    leafScaleMulFar: cfg.farLeafScaleMul,
    trunkRadialSegmentsNear: cfg.nearTrunkRadialSegments,
    trunkRadialSegmentsFar: cfg.farTrunkRadialSegments,
    includeBranchesFar: cfg.includeBranchesFar,
    config: cfg,
  }), [nearInstances, farInstances, billboardInstances, cfg])
}
