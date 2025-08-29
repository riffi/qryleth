import React, { useCallback, useEffect, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import {
  useViewMode,
  useSelectedObject,
  useSceneObjects,
  useSceneObjectInstances
} from '../../../model/sceneStore.ts'
import { useSceneStore } from '../../../model/sceneStore.ts'
import {
  calculateObjectBoundingBox,
  transformBoundingBox,
  getBoundingBoxCenter
} from '@/shared/lib/geometry/boundingBoxUtils'
import { WalkControls } from './WalkControls.tsx'
import { FlyControls } from './FlyControls.tsx'
import { FlyoverControls } from './FlyoverControls.tsx'
import { UiMode } from '@/shared/types/ui'

/**
 * Компонент переключает режимы управления камерой.
 * В режиме OrbitControls отслеживает выбранный инстанс
 * и устанавливает его центр вращения для камеры.
 */

export const CameraControls: React.FC = () => {
  const viewMode = useViewMode()
  // Храним предыдущее значение режима камеры для корректной обработки переходов
  const prevViewModeRef = useRef<typeof viewMode>(viewMode)
  const selected = useSelectedObject()
  const objects = useSceneObjects()
  const instances = useSceneObjectInstances()
  const controlsRef = useRef<any>(null)
  const { scene, camera } = useThree()
  const uiMode = useSceneStore(s => s.uiMode)
  const setViewMode = useSceneStore(s => s.setViewMode)
  const saveCameraPose = useSceneStore(s => s.saveCameraPose)
  const restoreCameraPose = useSceneStore(s => s.restoreCameraPose)
  // Флаг автопривязки цели OrbitControls к выбранному инстансу
  const autoOrbitTargetOnSelect = useSceneStore(s => s.autoOrbitTargetOnSelect)

  // RAF идентификатор для текущей анимации движения цели OrbitControls
  const targetAnimRafRef = useRef<number | null>(null)

  /**
   * Плавно перемещает цель OrbitControls к указанной точке.
   *
   * Реализовано через requestAnimationFrame с кубическим сглаживанием (easeInOutCubic).
   * При новом вызове прерывает предыдущую анимацию, чтобы не накапливать переходы.
   *
   * @param toPoint - конечная точка цели [x, y, z]
   * @param durationMs - длительность анимации в миллисекундах (по умолчанию 420 мс)
   */
  const animateOrbitTarget = useCallback((toPoint: [number, number, number], durationMs = 420) => {
    const controls = controlsRef.current
    if (!controls) return

    // Отменяем предыдущую анимацию, если она ещё идёт
    if (targetAnimRafRef.current !== null) {
      cancelAnimationFrame(targetAnimRafRef.current)
      targetAnimRafRef.current = null
    }

    const start = new Vector3().copy(controls.target)
    const end = new Vector3(toPoint[0], toPoint[1], toPoint[2])

    // Если движение микроскопическое — просто установить и выйти
    if (start.distanceToSquared(end) < 1e-6) {
      controls.target.copy(end)
      controls.update()
      return
    }

    const t0 = performance.now()
    const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

    const step = () => {
      const now = performance.now()
      const t = Math.min(1, (now - t0) / Math.max(1, durationMs))
      const k = easeInOutCubic(t)
      const cur = start.clone().lerp(end, k)
      controls.target.copy(cur)
      controls.update()
      if (t < 1) {
        targetAnimRafRef.current = requestAnimationFrame(step)
      } else {
        targetAnimRafRef.current = null
      }
    }

    targetAnimRafRef.current = requestAnimationFrame(step)
  }, [])

  /**
   * При смене выделения обновляет цель OrbitControls
   * чтобы камера вращалась вокруг выбранного объекта.
   */
  useEffect(() => {
    // Если режим не Orbit, нет контролов или автопривязка отключена — ничего не делаем
    if (viewMode !== 'orbit' || !controlsRef.current || !autoOrbitTargetOnSelect) return

    // При отсутствии выделения плавно возвращаем цель в (0, 0, 0)
    if (!selected) {
      animateOrbitTarget([0, 0, 0])
      return
    }

    const obj = objects.find(o => o.uuid === selected.objectUuid)
    if (!obj) return
    const inst = instances.find(i => i.uuid === selected.instanceUuid)

    const baseBox = obj.boundingBox ?? calculateObjectBoundingBox(obj)
    const worldBox = transformBoundingBox(baseBox, inst?.transform)
    const center = getBoundingBoxCenter(worldBox)

    animateOrbitTarget([center[0], center[1], center[2]])
  }, [selected, viewMode, objects, instances, scene, autoOrbitTargetOnSelect, animateOrbitTarget])

  // Очистка RAF при размонтировании
  useEffect(() => {
    return () => {
      if (targetAnimRafRef.current !== null) {
        cancelAnimationFrame(targetAnimRafRef.current)
        targetAnimRafRef.current = null
      }
    }
  }, [])

  /**
   * При входе в режим редактирования принудительно используем Orbit.
   */
  useEffect(() => {
    if (uiMode === UiMode.Edit && viewMode !== 'orbit') {
      setViewMode('orbit')
    }
  }, [uiMode, viewMode, setViewMode])

  /**
   * Освобождает pointer lock при переходе из Walk/Fly в Orbit в режиме Play.
   * Благодаря этому при переключении камеры курсор становится доступен
   * сразу, без необходимости дополнительно нажимать Esc.
   */
  useEffect(() => {
    try {
      const was = prevViewModeRef.current
      if (uiMode === UiMode.Play && viewMode === 'orbit' && (was === 'walk' || was === 'fly')) {
        // Если до этого использовались Walk/Fly (pointer lock), отпускаем курсор
        if (typeof document !== 'undefined' && typeof (document as any).exitPointerLock === 'function') {
          ;(document as any).exitPointerLock()
        }
      }
    } finally {
      prevViewModeRef.current = viewMode
    }
  }, [uiMode, viewMode])

  /**
   * Сохраняем позу камеры при смене режима управления.
   * Восстанавливаем позу при входе в новый режим, если сохранена.
   */
  useEffect(() => {
    // Восстановление: при входе в Orbit возвращаем позицию и target (если сохранены)
    if (viewMode === 'orbit' && controlsRef.current) {
      const pose = restoreCameraPose()
      if (pose) {
        try {
          if (pose.position) {
            camera.position.set(pose.position[0], pose.position[1], pose.position[2])
          }
          if (pose.target) {
            controlsRef.current.target.set(pose.target[0], pose.target[1], pose.target[2])
            controlsRef.current.update()
          }
        } catch {}
      }
    }

    // Сохранение: перед сменой режима (cleanup) сохраняем текущую позу
    return () => {
      try {
        if (viewMode === 'orbit') {
          const target = controlsRef.current?.target
          const pose = {
            position: [camera.position.x, camera.position.y, camera.position.z] as [number, number, number],
            target: target ? [target.x, target.y, target.z] as [number, number, number] : ([0, 0, 0] as [number, number, number])
          }
          saveCameraPose(pose)
        } else if (viewMode === 'walk' || viewMode === 'fly') {
          const e = camera.rotation
          const pose = {
            position: [camera.position.x, camera.position.y, camera.position.z] as [number, number, number],
            rotation: [e.x, e.y, e.z] as [number, number, number]
          }
          saveCameraPose(pose)
        }
      } catch {}
    }
  }, [viewMode, camera, saveCameraPose, restoreCameraPose])

  switch (viewMode) {
    case 'orbit':
      return (
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.05}
          enableZoom
          enablePan
        />
      )

    case 'walk':
      return <WalkControls />

    case 'fly':
      return <FlyControls />

    case 'flyover':
      return <FlyoverControls />

    default:
      return (
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.05}
          enableZoom
          enablePan
        />
      )
  }
}
