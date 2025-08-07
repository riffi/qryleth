import React, { useEffect, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import {
  useViewMode,
  useSelectedObject,
  useSceneObjects,
  useSceneObjectInstances
} from '../../../model/sceneStore.ts'
import {
  calculateObjectBoundingBox,
  transformBoundingBox,
  getBoundingBoxCenter
} from '@/shared/lib/geometry/boundingBoxUtils'
import { WalkControls } from './WalkControls.tsx'
import { FlyControls } from './FlyControls.tsx'

/**
 * Компонент переключает режимы управления камерой.
 * В режиме OrbitControls отслеживает выбранный инстанс
 * и устанавливает его центр вращения для камеры.
 */

export const CameraControls: React.FC = () => {
  const viewMode = useViewMode()
  const selected = useSelectedObject()
  const objects = useSceneObjects()
  const instances = useSceneObjectInstances()
  const controlsRef = useRef<any>(null)
  const { scene } = useThree()

  /**
   * При смене выделения обновляет цель OrbitControls
   * чтобы камера вращалась вокруг выбранного объекта.
   */
  useEffect(() => {
    if (viewMode !== 'orbit' || !controlsRef.current) return

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
  }, [selected, viewMode, objects, instances, scene])

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
