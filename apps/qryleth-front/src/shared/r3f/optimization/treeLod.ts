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
   * Флаг включения системы LOD.
   *
   * false — всегда используется ближний LOD (near), без переходов и билбордов;
   * true  — работает стандартная логика экранно‑пространственных порогов.
   */
  enabled?: boolean
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
  /** Временный режим: только 2 LOD (near/billboard) с переходом между ними. */
  twoLevelOnly?: boolean
  /** Временный флаг: отключить фейд и смешивание между LOD — резкое переключение. */
  noBlend?: boolean
  /** Ширина полосы фейда Near↔Far в пикселях (отдельно от гистерезиса). */
  fadeWidthNearPx?: number
  /** Ширина полосы фейда Far↔Billboard в пикселях (отдельно от гистерезиса). */
  fadeWidthFarPx?: number
}

/**
 * Базовые значения LOD, подобранные для сохранения визуальной похожести дерева в дальнем LOD.
 */
export const defaultTreeLodConfig: TreeLodConfig = {
  enabled: true,
  // Устаревшие «метровые» пороги — используются только если не заданы Px‑пороги
  nearDistance: 30,
  farDistance: 50,
  billboardDistance: 70,

  // ИСПРАВЛЕНО: Настроены широкие диапазоны для покрытия всех дистанций
  // Near LOD: дерево > 250px на экране (очень близко)
  // Far LOD: дерево 50-250px (средняя дистанция) - основной режим
  // Billboard: дерево < 50px (очень далеко)
  nearOutPx: 210,  // Near → Far когда дерево < 200px
  nearInPx: 230,   // Возврат к Near когда > 250px
  // Сужаем пороги LOD3 (ближе к камере)
  farOutPx: 120,    // Far → Billboard когда < 60px
  farInPx: 150,    // Возврат к Far когда > 100px
  epsilonPx: 1,
  approximateTreeHeightWorld: 10,

  // Упрощение листвы вдали
  farLeafSampleRatio: 0.4,
  farLeafScaleMul: 2,
  nearTrunkRadialSegments: 12,
  farTrunkRadialSegments: 8,
  includeBranchesFar: false,
  twoLevelOnly: false,
  noBlend: false,
  fadeWidthNearPx: 20,
  fadeWidthFarPx: 20,
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
  // Последняя мировая позиция камеры — используется для детекции движения и расчётов
  const lastCameraWorldRef = React.useRef(new THREE.Vector3())
  const frameCountRef = React.useRef(0)
  const [weights, setWeights] = React.useState({ near: 1, far: 0, bb: 0 })

  // Стабильный класс по гистерезису (без учёта фейда)
  const stableLodRef = React.useRef<'near' | 'far' | 'bb'>('near')

  useFrame((state) => {
    // Если LOD отключён глобально — всегда отдаём near и выходим
    if (cfg.enabled === false) {
      const next = { near: 1, far: 0, bb: 0 }
      setWeights(prev => (prev.near !== next.near || prev.far !== next.far || prev.bb !== next.bb) ? next : prev)
      return
    }
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
    // ВАЖНО: используем мировую позицию камеры (getWorldPosition), т.к. в walk‑режиме
    // камера может быть дочерним объектом рига и её local position не меняется.
    camera.getWorldPosition(_cameraPos)
    const camToObj = _worldPos.copy(g.getWorldPosition(new THREE.Vector3())).sub(_cameraPos)
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
    const fadeNear = Math.max(0, cfg.fadeWidthNearPx ?? 0)
    const fadeFar  = Math.max(0, cfg.fadeWidthFarPx ?? 0)
    const nearFadeHalfD = toDist((cfg.nearOutPx || 0) + fadeNear * 0.5) // верхняя кромка (ближе)
    const nearFadeLowD  = toDist(Math.max(1e-3, (cfg.nearOutPx || 0) - fadeNear * 0.5)) // нижняя кромка (дальше)
    const farFadeLowD   = toDist(Math.max(1e-3, (cfg.farOutPx || 0) - fadeFar * 0.5))
    const farFadeHighD  = toDist((cfg.farOutPx || 0) + fadeFar * 0.5)

    // Fallback к старым метровым порогам, если Px не заданы
    const nearDflt = cfg.nearDistance
    const farDflt = cfg.farDistance
    const bbDflt = cfg.billboardDistance

    // Вычисление весов
    let wNear = 0, wFar = 0, wBB = 0

    if (nearInD && nearOutD && farInD && farOutD) {
      // 1) Сначала дискретное решение по гистерезису (без фейда)
      let stable = stableLodRef.current
      if (stable === 'near') {
        if (dist >= (nearOutD || 0)) stable = 'far'
      } else if (stable === 'far') {
        if (dist <= (nearInD || 0)) stable = 'near'
        else if (dist >= (farOutD || 0)) stable = 'bb'
      } else { // 'bb'
        if (dist <= (farInD || 0)) stable = 'far'
      }
      stableLodRef.current = stable

      // 2) Узкая полоса фейда — только вокруг активной границы
      if (cfg.noBlend) {
        // Режим без фейда: сразу отдаем стабильный класс
        if (stable === 'near') wNear = 1
        else if (stable === 'far') wFar = 1
        else wBB = 1
      } else {
        if (stable === 'near') {
          // Вблизи границы nearOut: near↔far фейд только в полосе fadeWidthNearPx
          if (fadeNear > 0 && nearFadeLowD && nearFadeHalfD && dist > nearFadeLowD && dist < nearFadeHalfD) {
            const t = (dist - nearFadeHalfD) / Math.max(1e-6, (nearFadeLowD - nearFadeHalfD))
            wNear = 1 - t; wFar = t
          } else {
            wNear = 1
          }
        } else if (stable === 'far') {
          // Две потенциальные границы для far: к near (nearIn) и к bb (farOut)
          let blended = false
          if (fadeNear > 0 && nearInD) {
            const halfUpper = toDist(Math.max(1e-3, (cfg.nearInPx || 0) + fadeNear * 0.5))
            const halfLower = toDist(Math.max(1e-3, (cfg.nearInPx || 0) - fadeNear * 0.5))
            if (halfLower && halfUpper && dist > halfLower && dist < halfUpper) {
              const t = (dist - halfLower) / Math.max(1e-6, (halfUpper - halfLower))
              wNear = t; wFar = 1 - t; blended = true
            }
          }
          if (!blended && fadeFar > 0 && farFadeLowD && farFadeHighD && dist > farFadeLowD && dist < farFadeHighD) {
            const t = (dist - farFadeLowD) / Math.max(1e-6, (farFadeHighD - farFadeLowD))
            wFar = 1 - t; wBB = t; blended = true
          }
          if (!blended) wFar = 1
        } else { // stable === 'bb'
          // Вблизи границы farIn: bb↔far фейд только в полосе fadeWidthFarPx
          if (fadeFar > 0 && farFadeLowD && farFadeHighD && dist > farFadeLowD && dist < farFadeHighD) {
            const t = 1 - (dist - farFadeLowD) / Math.max(1e-6, (farFadeHighD - farFadeLowD))
            wFar = t; wBB = 1 - t
          } else {
            wBB = 1
          }
        }
      }
    } else {
      // Обратная совместимость: по метровым порогам (без двойного окна)
      const nearSq = nearDflt * nearDflt
      const farSq = farDflt * farDflt
      const bbSq = bbDflt * bbDflt
      // Приблизим dist к sqrt(distance^2), чтобы не менять поведение радикально
      g.getWorldPosition(_worldPos)
      camera.getWorldPosition(_cameraPos)
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
  // Последняя мировая позиция камеры (а не локальная camera.position)
  const lastCameraPosRef = React.useRef(new THREE.Vector3())
  const lastLodUpdateFrameRef = React.useRef(0)
  // Флаг: фиксируем, что была заметная смена позиции камеры в период, когда сработал throttling
  // Нужен, чтобы не «застревать» в старой классификации, если последнее движение попало в окно пропуска.
  const hadMovementWhileThrottledRef = React.useRef(false)

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
      frameCountRef.current++

      // При выключенном LOD — все инстансы относятся к near; остальные наборы пустые
      if (cfg.enabled === false) {
        const all = instances
        const sig = (arr: SceneObjectInstance[]) => arr.map(x => x.uuid).join('|')
        const sNear = sig(all)
        if (sNear !== prevSignaturesRef.current.near) {
          prevSignaturesRef.current.near = sNear
          setNearSolid(all)
        }
        // Остальные наборы очищаем один раз
        if (prevSignaturesRef.current.far !== '') { prevSignaturesRef.current.far = '' ; setFarSolid([]) }
        if (prevSignaturesRef.current.bb  !== '') { prevSignaturesRef.current.bb  = '' ; setBbSolid([]) }
        if (prevSignaturesRef.current.nf  !== '') { prevSignaturesRef.current.nf  = '' ; setNearFarBlend([]) }
        if (prevSignaturesRef.current.fb  !== '') { prevSignaturesRef.current.fb  = '' ; setFarBbBlend([]) }
        return
      }
    const camera = state.camera as THREE.PerspectiveCamera

    // ОПТИМИЗАЦИЯ: Throttling — в режиме отладки (twoLevelOnly/noBlend)
    // пересчитываем чаще, чтобы исключить «залипание» состояний.
    const LOD_UPDATE_THROTTLE = (cfg.twoLevelOnly || cfg.noBlend) ? 1 : 3
    const framesSinceLastUpdate = frameCountRef.current - lastLodUpdateFrameRef.current

    // Оценка движения камеры (достаточно заметная смена позиции)
    // Детекция движения: сравниваем МИРОВУЮ позицию камеры с предыдущей
    const camWorldNow = new THREE.Vector3()
    camera.getWorldPosition(camWorldNow)
    const camMoved = camWorldNow.distanceToSquared(lastCameraPosRef.current) > 0.01 // было 1e-4

    // Если в окне троттлинга — отмечаем факт движения и выходим,
    // чтобы выполнить пересчёт в следующий допустимый кадр даже если камера уже остановилась.
    if (framesSinceLastUpdate < LOD_UPDATE_THROTTLE) {
      if (camMoved) hadMovementWhileThrottledRef.current = true
      return
    }

    // Если камера не движется, но было движение в окне троттлинга — всё равно пересчитаем один раз.
    if (!camMoved && !hadMovementWhileThrottledRef.current) {
      // В режиме отладки (twoLevelOnly/noBlend) — не ждём движения, пересчитываем всегда
      if (!(cfg.twoLevelOnly || cfg.noBlend)) {
        // В качестве дополнительной страховки: редкий пересчёт каждые ~30 кадров,
        // чтобы учесть внешние изменения (например, изменение размеров вьюпорта).
        const RARE_RECALC_PERIOD = 30
        if (framesSinceLastUpdate < RARE_RECALC_PERIOD) return
      }
    }

    // Фиксируем текущую позицию камеры и момент обновления
    lastCameraPosRef.current.copy(camWorldNow)
    lastLodUpdateFrameRef.current = frameCountRef.current
    hadMovementWhileThrottledRef.current = false

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

    // Текущая мировая позиция камеры для расчёта дистанций до инстансов
    const camWorld = new THREE.Vector3(); camera.getWorldPosition(camWorld)
    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i]
      const p = inst.transform?.position || [0, 0, 0]
      const dx = camWorld.x - p[0]
      const dy = camWorld.y - p[1]
      const dz = camWorld.z - p[2]
      const d = Math.max(0.001, Math.hypot(dx, dy, dz))
      const Spx = Hworld * (projK / d)
      const dist = 1 / Math.max(Spx, epsPx)

      if (nearInD && nearOutD && farInD && farOutD) {
        // Раздельно: гистерезис + узкая полоса фейда
        const fadeNear = Math.max(0, cfg.fadeWidthNearPx ?? 0)
        const fadeFar  = Math.max(0, cfg.fadeWidthFarPx ?? 0)

        // Границы полос фейда в dist-пространстве
        const nearOutPx = cfg.nearOutPx || 0
        const nearInPx  = cfg.nearInPx  || 0
        const farOutPx  = cfg.farOutPx  || 0
        const nearFadeHalfD = toDist(nearOutPx + fadeNear * 0.5)
        const nearFadeLowD  = toDist(Math.max(1e-3, nearOutPx - fadeNear * 0.5))
        const nearInLowD    = toDist(Math.max(1e-3, nearInPx - fadeNear * 0.5))
        const nearInHighD   = toDist(nearInPx + fadeNear * 0.5)
        const farFadeLowD   = toDist(Math.max(1e-3, farOutPx - fadeFar * 0.5))
        const farFadeHighD  = toDist(farOutPx + fadeFar * 0.5)

        const prev = prevClassRef.current[inst.uuid] || 'near'
        let stable: 'near' | 'far' | 'bb' = prev
        // Гистерезис: обновляем стабильный класс только при пересечении порогов
        if (stable === 'near') {
          if (dist >= (nearOutD || 0)) stable = 'far'
        } else if (stable === 'far') {
          if (dist <= (nearInD || 0)) stable = 'near'
          else if (dist >= (farOutD || 0)) stable = 'bb'
        } else { // bb
          if (dist <= (farInD || 0)) stable = 'far'
        }

        if (cfg.noBlend) {
          if (stable === 'near') { nextNear.push(inst); nextClass[inst.uuid] = 'near' }
          else if (stable === 'far') { nextFar.push(inst); nextClass[inst.uuid] = 'far' }
          else { nextBB.push(inst); nextClass[inst.uuid] = 'bb' }
        } else {
          if (stable === 'near') {
            if (fadeNear > 0 && nearFadeLowD && nearFadeHalfD && dist > nearFadeLowD && dist < nearFadeHalfD) {
              const t = (dist - nearFadeHalfD) / Math.max(1e-6, (nearFadeLowD - nearFadeHalfD))
              nextNF.push({ inst, t }); nextClass[inst.uuid] = 'nf'; nextBlend[inst.uuid] = t
            } else { nextNear.push(inst); nextClass[inst.uuid] = 'near' }
          } else if (stable === 'far') {
            let blended = false
            if (fadeNear > 0 && nearInLowD && nearInHighD && dist > nearInLowD && dist < nearInHighD) {
              const t = (dist - nearInLowD) / Math.max(1e-6, (nearInHighD - nearInLowD))
              nextNF.push({ inst, t }); nextClass[inst.uuid] = 'nf'; nextBlend[inst.uuid] = t; blended = true
            }
            if (!blended && fadeFar > 0 && farFadeLowD && farFadeHighD && dist > farFadeLowD && dist < farFadeHighD) {
              const t = (dist - farFadeLowD) / Math.max(1e-6, (farFadeHighD - farFadeLowD))
              nextFB.push({ inst, t }); nextClass[inst.uuid] = 'fb'; nextBlend[inst.uuid] = t; blended = true
            }
            if (!blended) { nextFar.push(inst); nextClass[inst.uuid] = 'far' }
          } else { // bb
            if (fadeFar > 0 && farFadeLowD && farFadeHighD && dist > farFadeLowD && dist < farFadeHighD) {
              const t = 1 - (dist - farFadeLowD) / Math.max(1e-6, (farFadeHighD - farFadeLowD))
              nextFB.push({ inst, t }); nextClass[inst.uuid] = 'fb'; nextBlend[inst.uuid] = t
            } else { nextBB.push(inst); nextClass[inst.uuid] = 'bb' }
          }
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

    if (!anyChanged && LOD_DEBUG && (frameCountRef.current % debugEveryNFrames === 0)) {
      console.log('[LOD][partition][idle] no changes at camera move')
    }
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
