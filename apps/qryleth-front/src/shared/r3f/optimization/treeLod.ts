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
  /**
   * НИЖЕ — устаревшие пороги по «мировой дистанции».
   * Оставлены для обратной совместимости и будут проигнорированы,
   * если заданы screen‑space пороги (nearInPx/nearOutPx/farInPx/farOutPx).
   */
  nearDistance: number
  farDistance: number
  /** Порог для LOD3 (билборд), если не заданы screen‑space пороги */
  billboardDistance: number

  /**
   * Экранно‑пространственные пороги (в пикселях), задаются по высоте кроны в кадре:
   * Пусть Spx — проекция высоты дерева в пикселях; dist = 1 / max(Spx, ε)
   * Гистерезисы:
   *  - Включить Far: dist ≥ nearOut (т.е. Spx ≤ nearOutPx)
   *  - Вернуться к Near: dist ≤ nearIn (т.е. Spx ≥ nearInPx)
   *  - Включить Billboard: dist ≥ farOut (т.е. Spx ≤ farOutPx)
   *  - Вернуться к Far: dist ≤ farIn (т.е. Spx ≥ farInPx)
   * Условие корректности: nearIn < nearOut ≤ farIn < farOut (в dist‑пространстве).
   * Для задания удобнее указывать именно пиксели — мы сами преобразуем в dist.
   */
  nearInPx?: number
  nearOutPx?: number
  farInPx?: number
  farOutPx?: number
  /** Минимальная величина в пикселях для избежания деления на ноль */
  epsilonPx?: number
  /**
   * При расчёте Spx (в usePartitionInstancesByLod) требуется оценка высоты дерева в мире.
   * Для одиночного дерева мы берём реальный bounding box группы.
   * Для батч‑хука используем эту аппроксимацию (метры по Y), если не можем узнать точно.
   */
  approximateTreeHeightWorld?: number

  // Параметры упрощения листвы в дальнем LOD
  farLeafSampleRatio: number
  farLeafScaleMul: number
  nearTrunkRadialSegments: number
  farTrunkRadialSegments: number
  includeBranchesFar: boolean
}

/**
 * Базовые значения LOD, подобранные для сохранения визуальной похожести дерева в дальнем LOD.
 */
export const defaultTreeLodConfig: TreeLodConfig = {
  // Устаревшие «метровые» пороги — используются только если не заданы Px‑пороги
  nearDistance: 30,
  farDistance: 50,
  billboardDistance: 70,

  // Рекомендуемые screen‑space пороги (px по высоте кроны)
  // Near↔Far — окно ~30px (короче), Far↔BB — окно ~35px (длиннее)
  nearOutPx: 200,
  nearInPx: 250,
  farOutPx: 70,
  farInPx: 90,
  epsilonPx: 3,
  approximateTreeHeightWorld: 10,

  // Упрощение листвы вдали
  farLeafSampleRatio: 0.4,
  farLeafScaleMul: 2,
  nearTrunkRadialSegments: 12,
  farTrunkRadialSegments: 8,
  includeBranchesFar: false,
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
  /**
   * Подробно: Хук рассчитывает экранно‑пространственный размер дерева (Spx)
   * по bounding box группы и текущей камере, затем строит метрику
   * dist = 1 / max(Spx, ε) и вычисляет веса трёх состояний:
   *  - Near (полная геометрия),
   *  - Far (упрощённая геометрия),
   *  - Billboard (билборд).
   * В окнах [nearIn..nearOut] и [farIn..farOut] возвращаются смешанные веса,
   * что позволяет выполнять двойную отрисовку без «прыжков».
   */
  const cfg = React.useMemo(() => ({ ...defaultTreeLodConfig, ...(config || {}) }), [config])
  const bboxRef = React.useRef<THREE.Box3 | null>(null)
  const bboxHeightRef = React.useRef<number>(cfg.approximateTreeHeightWorld || 10)
  const frameCountRef = React.useRef(0)
  const [weights, setWeights] = React.useState({ near: 1, far: 0, bb: 0 })

  useFrame((state) => {
    const g = groupRef.current
    if (!g) return

    // Обновляем bbox не чаще раза в 15 кадров
    frameCountRef.current++
    if (!bboxRef.current || frameCountRef.current % 15 === 0) {
      const box = new THREE.Box3().setFromObject(g)
      bboxRef.current = box
      const h = Math.max(0.001, (box.max.y - box.min.y) || (cfg.approximateTreeHeightWorld || 10))
      bboxHeightRef.current = h
    }

    const camera = state.camera as THREE.PerspectiveCamera
    // Оценка высоты в пикселях: Spx ≈ Hworld * (Hpx / (2*tan(fov/2) * d))
    const camToObj = _worldPos.copy(g.getWorldPosition(new THREE.Vector3())).sub(camera.position)
    const d = Math.max(0.001, camToObj.length())
    const Hpx = state.size.height
    const fovRad = (camera.fov ?? 60) * Math.PI / 180
    const projK = Hpx / (2 * Math.tan(fovRad * 0.5))
    const Spx = bboxHeightRef.current * (projK / d)
    const epsPx = Math.max(1e-3, cfg.epsilonPx ?? 1)
    const dist = 1 / Math.max(Spx, epsPx)

    // Преобразуем Px‑пороги в dist‑пороговые значения
    const toDist = (px?: number) => px && px > 0 ? (1 / Math.max(px, epsPx)) : undefined
    const nearInD  = toDist(cfg.nearInPx)
    const nearOutD = toDist(cfg.nearOutPx)
    const farInD   = toDist(cfg.farInPx)
    const farOutD  = toDist(cfg.farOutPx)

    // Fallback к старым метровым порогам, если Px не заданы
    const nearDflt = cfg.nearDistance
    const farDflt = cfg.farDistance
    const bbDflt = cfg.billboardDistance

    // Вычисление весов
    let wNear = 0, wFar = 0, wBB = 0

    if (nearInD && nearOutD && farInD && farOutD) {
      // near зона
      if (dist <= nearInD) {
        wNear = 1
      } else if (dist < nearOutD) {
        const t = (dist - nearInD) / Math.max(1e-6, (nearOutD - nearInD))
        wNear = 1 - t
        wFar = t
      } else if (dist <= farInD) {
        wFar = 1
      } else if (dist < farOutD) {
        const t = (dist - farInD) / Math.max(1e-6, (farOutD - farInD))
        wFar = 1 - t
        wBB = t
      } else {
        wBB = 1
      }
    } else {
      // Обратная совместимость: по метровым порогам (без двойного окна)
      const nearSq = nearDflt * nearDflt
      const farSq = farDflt * farDflt
      const bbSq = bbDflt * bbDflt
      // Приблизим dist к sqrt(distance^2), чтобы не менять поведение радикально
      g.getWorldPosition(_worldPos)
      _cameraPos.copy(camera.position)
      const dsq = _worldPos.distanceToSquared(_cameraPos)
      if (dsq <= nearSq) { wNear = 1 } else if (dsq <= farSq) { wFar = 1 } else if (dsq <= bbSq) { wBB = 1 } else { wBB = 1 }
    }

    // Нормализация на всякий случай
    const s = Math.max(1e-6, wNear + wFar + wBB)
    const next = { near: wNear / s, far: wFar / s, bb: wBB / s }
    setWeights(prev => (prev.near !== next.near || prev.far !== next.far || prev.bb !== next.bb) ? next : prev)
  })

  const isFar = weights.far > 0.5 && weights.bb < 0.5
  const isBillboard = weights.bb > 0.5

  return React.useMemo(() => ({
    // Веса для двойной отрисовки (сумма ≈ 1)
    nearWeight: weights.near,
    farWeight: weights.far,
    billboardWeight: weights.bb,
    // Совместимость со старым API
    lodLevel: isBillboard ? 3 : (isFar ? 2 : 0) as 0 | 2 | 3,
    isFar,
    isBillboard,
    leafSampleRatio: weights.far > 0 ? cfg.farLeafSampleRatio : undefined,
    leafScaleMul: weights.far > 0 ? cfg.farLeafScaleMul : 1,
    trunkRadialSegments: weights.far > 0 && weights.near === 0 ? cfg.farTrunkRadialSegments : cfg.nearTrunkRadialSegments,
    includeBranchesInFar: cfg.includeBranchesFar,
    // Старый индикатор перехода near↔far (оставлен для обратной совместимости)
    lodBlend: weights.far,
    config: cfg,
  }), [weights, isFar, isBillboard, cfg])
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
  /**
   * Подробно: Хук бежит по списку инстансов, оценивает их экранную высоту
   * Spx ≈ Hworld * (Hpx / (2*tan(fov/2) * d)) на основе приблизительной
   * высоты дерева (config.approximateTreeHeightWorld) и заполняет пять наборов:
   *  - nearSolid — чистый Near,
   *  - nearFarBlend — переходная зона Near↔Far с коэффициентом t ∈ [0..1],
   *  - farSolid — чистый Far,
   *  - farBillboardBlend — переходная зона Far↔Billboard с коэффициентом t,
   *  - billboardSolid — чистый Billboard.
   * Для обратной совместимости возвращаем также nearInstances/farInstances/
   * billboardInstances как «solid»-наборы.
   */
  const cfg = React.useMemo(() => ({ ...defaultTreeLodConfig, ...(config || {}) }), [config])

  const [nearSolid, setNearSolid] = React.useState<SceneObjectInstance[]>(instances)
  const [farSolid, setFarSolid] = React.useState<SceneObjectInstance[]>([])
  const [bbSolid, setBbSolid] = React.useState<SceneObjectInstance[]>([])
  const [nearFarBlend, setNearFarBlend] = React.useState<Array<{ inst: SceneObjectInstance, t: number }>>([])
  const [farBbBlend, setFarBbBlend] = React.useState<Array<{ inst: SceneObjectInstance, t: number }>>([])

  const frameCountRef = React.useRef(0)
  const lastCameraPosRef = React.useRef(new THREE.Vector3())

  // ИСПРАВЛЕНИЕ: Используем useRef для хранения предыдущих сигнатур
  const prevSignaturesRef = React.useRef<{
    near: string
    far: string
    bb: string
    nf: string
    fb: string
  }>({
    near: '',
    far: '',
    bb: '',
    nf: '',
    fb: ''
  })

  // Отладка: предыдущая классификация для оценки «дрожания»
  const prevClassRef = React.useRef<Record<string, 'near' | 'nf' | 'far' | 'fb' | 'bb'>>({})
  const prevBlendRef = React.useRef<Record<string, number>>({})
  const debugEveryNFrames = 15
  const LOD_DEBUG = (typeof window !== 'undefined') && !!(window as any).__LOD_DEBUG_TREE__

  useFrame((state) => {
    const camera = state.camera as THREE.PerspectiveCamera

    // ИСПРАВЛЕНИЕ: Увеличиваем порог для определения движения камеры
    const camMoved = camera.position.distanceToSquared(lastCameraPosRef.current) > 0.01 // было 1e-4
    if (!camMoved) return
    lastCameraPosRef.current.copy(camera.position)

    const Hpx = state.size.height
    const fovRad = (camera.fov ?? 60) * Math.PI / 180
    const projK = Hpx / (2 * Math.tan(fovRad * 0.5))
    const epsPx = Math.max(1e-3, cfg.epsilonPx ?? 1)
    const toDist = (px?: number) => px && px > 0 ? (1 / Math.max(px, epsPx)) : undefined
    const nearInD  = toDist(cfg.nearInPx)
    const nearOutD = toDist(cfg.nearOutPx)
    const farInD   = toDist(cfg.farInPx)
    const farOutD  = toDist(cfg.farOutPx)
    const Hworld = Math.max(0.001, cfg.approximateTreeHeightWorld || 10)

    const nextNear: SceneObjectInstance[] = []
    const nextFar: SceneObjectInstance[] = []
    const nextBB: SceneObjectInstance[] = []
    const nextNF: Array<{ inst: SceneObjectInstance, t: number }> = []
    const nextFB: Array<{ inst: SceneObjectInstance, t: number }> = []
    const nextClass: Record<string, 'near' | 'nf' | 'far' | 'fb' | 'bb'> = {}
    const nextBlend: Record<string, number> = {}

    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i]
      const p = inst.transform?.position || [0, 0, 0]
      const dx = camera.position.x - p[0]
      const dy = camera.position.y - p[1]
      const dz = camera.position.z - p[2]
      const d = Math.max(0.001, Math.hypot(dx, dy, dz))
      const Spx = Hworld * (projK / d)
      const dist = 1 / Math.max(Spx, epsPx)

      if (nearInD && nearOutD && farInD && farOutD) {
        if (dist <= nearInD) {
          nextNear.push(inst); nextClass[inst.uuid] = 'near'
        } else if (dist < nearOutD) {
          const t = Math.min(1, Math.max(0, (dist - nearInD) / Math.max(1e-6, (nearOutD - nearInD))))
          nextNF.push({ inst, t }); nextClass[inst.uuid] = 'nf'; nextBlend[inst.uuid] = t
        } else if (dist <= farInD) {
          nextFar.push(inst); nextClass[inst.uuid] = 'far'
        } else if (dist < farOutD) {
          const t = Math.min(1, Math.max(0, (dist - farInD) / Math.max(1e-6, (farOutD - farInD))))
          nextFB.push({ inst, t }); nextClass[inst.uuid] = 'fb'; nextBlend[inst.uuid] = t
        } else {
          nextBB.push(inst); nextClass[inst.uuid] = 'bb'
        }
      } else {
        // Fallback к старым порогам (метры)
        const farDist = cfg.farDistance
        const bbDist = cfg.billboardDistance
        if (d <= cfg.nearDistance) { nextNear.push(inst); nextClass[inst.uuid] = 'near' }
        else if (d <= farDist) { nextFar.push(inst); nextClass[inst.uuid] = 'far' }
        else if (d <= bbDist) { nextBB.push(inst); nextClass[inst.uuid] = 'bb' }
        else { nextBB.push(inst); nextClass[inst.uuid] = 'bb' }
      }
    }

    // Стабилизуем порядок (по uuid), чтобы исключить лишние перестроения
    nextNear.sort((a, b) => a.uuid.localeCompare(b.uuid))
    nextFar.sort((a, b) => a.uuid.localeCompare(b.uuid))
    nextBB.sort((a, b) => a.uuid.localeCompare(b.uuid))
    nextNF.sort((a, b) => a.inst.uuid.localeCompare(b.inst.uuid))
    nextFB.sort((a, b) => a.inst.uuid.localeCompare(b.inst.uuid))

    // Отладка: считаем сколько инстансов реально сменили класс/квант t
    if (LOD_DEBUG && (frameCountRef.current % debugEveryNFrames === 0)) {
      let changed = 0, tChanged = 0
      for (const inst of instances) {
        const id = inst.uuid
        const was = prevClassRef.current[id]
        const now = nextClass[id]
        if (was !== now) changed++
        const tb = prevBlendRef.current[id]
        const tn = nextBlend[id]
        if (tn != null || tb != null) {
          // ИСПРАВЛЕНИЕ: Уменьшаем чувствительность квантования с 16 до 4
          const qb = Math.round((tb ?? 0) * 4) // было 16
          const qn = Math.round((tn ?? 0) * 4) // было 16
          if (qb !== qn) tChanged++
        }
      }
      const total = instances.length || 1
      console.log('[LOD][partition] near=%d nf=%d far=%d fb=%d bb=%d | changed=%d(%.1f%%) tChanged=%d(%.1f%%)',
          nextNear.length, nextNF.length, nextFar.length, nextFB.length, nextBB.length,
          changed, (changed * 100 / total), tChanged, (tChanged * 100 / total))
    }

    // Сохраняем «снимок» для следующего кадра
    prevClassRef.current = nextClass
    prevBlendRef.current = nextBlend

    // ИСПРАВЛЕНИЕ: Создаем сигнатуры и сравниваем с сохраненными в ref
    const sig = (arr: SceneObjectInstance[]) => arr.map(x => x.uuid).join('|')
    // ИСПРАВЛЕНИЕ: Уменьшаем чувствительность квантования для blend с 16 до 4
    const sigNF = (arr: Array<{inst: SceneObjectInstance, t: number}>) =>
        arr.map(x => `${x.inst.uuid}:${Math.round(x.t*4)}`).join('|') // было 16

    const sNear = sig(nextNear)
    const sFar = sig(nextFar)
    const sBB = sig(nextBB)
    const sNF = sigNF(nextNF)
    const sFB = sigNF(nextFB)

    let anyChanged = false

    // ИСПРАВЛЕНИЕ: Сравниваем с сохраненными в ref сигнатурами
    if (sNear !== prevSignaturesRef.current.near) {
      prevSignaturesRef.current.near = sNear
      setNearSolid(nextNear)
      anyChanged = true
    }
    if (sFar !== prevSignaturesRef.current.far) {
      prevSignaturesRef.current.far = sFar
      setFarSolid(nextFar)
      anyChanged = true
    }
    if (sBB !== prevSignaturesRef.current.bb) {
      prevSignaturesRef.current.bb = sBB
      setBbSolid(nextBB)
      anyChanged = true
    }
    if (sNF !== prevSignaturesRef.current.nf) {
      prevSignaturesRef.current.nf = sNF
      setNearFarBlend(nextNF)
      anyChanged = true
    }
    if (sFB !== prevSignaturesRef.current.fb) {
      prevSignaturesRef.current.fb = sFB
      setFarBbBlend(nextFB)
      anyChanged = true
    }

    if (!anyChanged && LOD_DEBUG && (frameCountRef.current++ % debugEveryNFrames === 0)) {
      console.log('[LOD][partition][idle] no changes at camera move')
    }

    frameCountRef.current++
  })

  return React.useMemo(() => ({
    // Совместимость (solid‑наборы)
    nearInstances: nearSolid,
    farInstances: farSolid,
    billboardInstances: bbSolid,
    // Расширенные наборы с переходами
    nearSolid,
    farSolid,
    billboardSolid: bbSolid,
    nearFarBlend,
    farBillboardBlend: farBbBlend,
    // Константы LOD
    leafSampleRatioFar: cfg.farLeafSampleRatio,
    leafScaleMulFar: cfg.farLeafScaleMul,
    trunkRadialSegmentsNear: cfg.nearTrunkRadialSegments,
    trunkRadialSegmentsFar: cfg.farTrunkRadialSegments,
    includeBranchesFar: cfg.includeBranchesFar,
    config: cfg,
    /**
     * Включение отладочных логов через консоль:
     * window.__LOD_DEBUG_TREE__ = true
     */
  }), [nearSolid, farSolid, bbSolid, nearFarBlend, farBbBlend, cfg])
}
