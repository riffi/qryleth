import React, { useEffect, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
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

  /**
   * При смене выделения обновляет цель OrbitControls
   * чтобы камера вращалась вокруг выбранного объекта.
   */
  useEffect(() => {
    // Если режим не Orbit, нет контролов или автопривязка отключена — ничего не делаем
    if (viewMode !== 'orbit' || !controlsRef.current || !autoOrbitTargetOnSelect) return

    if (!selected) {
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
      return
    }

    const obj = objects.find(o => o.uuid === selected.objectUuid)
    if (!obj) return
    const inst = instances.find(i => i.uuid === selected.instanceUuid)

    const baseBox = obj.boundingBox ?? calculateObjectBoundingBox(obj)
    const worldBox = transformBoundingBox(baseBox, inst?.transform)
    const center = getBoundingBoxCenter(worldBox)

    controlsRef.current.target.set(center[0], center[1], center[2])
    controlsRef.current.update()
  }, [selected, viewMode, objects, instances, scene, autoOrbitTargetOnSelect])

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
