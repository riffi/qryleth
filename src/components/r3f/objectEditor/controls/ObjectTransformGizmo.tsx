import React, { useRef, useEffect } from 'react'
import { TransformControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useObjectStore } from '../../../../stores/objectStore'
import { useOEObjectSelection } from '../../../../hooks/objectEditor/useOEObjectSelection'
import type { TransformGizmoProps } from '../../../../types/r3f'

export const ObjectTransformGizmo: React.FC<TransformGizmoProps> = ({ onTransform }) => {
  const { camera, gl, controls } = useThree()
  const transformControlsRef = useRef<any>()
  const selectedObject = useObjectStore(state => state.selectedObject)
  const transformMode = useObjectStore(state => state.transformMode)
  const updatePlacement = useObjectStore(state => state.updatePlacement)
  const { selectedObjects } = useOEObjectSelection()

  const targetObject = selectedObjects.length > 0 ? selectedObjects[0] : undefined

  const handleObjectChange = () => {
    if (!transformControlsRef.current?.object || !selectedObject) return
    const obj = transformControlsRef.current.object
    const position = obj.position
    const rotation = obj.rotation
    const scale = obj.scale
    if (selectedObject.placementIndex !== undefined) {
      updatePlacement(selectedObject.placementIndex, {
        position: [position.x, position.y, position.z],
        rotation: [rotation.x, rotation.y, rotation.z],
        scale: [scale.x, scale.y, scale.z]
      })
    }
    onTransform?.({
      objectIndex: selectedObject.objectIndex,
      instanceId: selectedObject.instanceId,
      placementIndex: selectedObject.placementIndex,
      position: [position.x, position.y, position.z],
      rotation: [rotation.x, rotation.y, rotation.z],
      scale: [scale.x, scale.y, scale.z]
    })
  }

  const handleDraggingChanged = (event: any) => {
    if (controls && 'enabled' in controls) {
      ;(controls as any).enabled = !event.value
    }
  }

  useEffect(() => {
    const controls = transformControlsRef.current
    if (!controls) return
    controls.addEventListener('objectChange', handleObjectChange)
    controls.addEventListener('dragging-changed', handleDraggingChanged)
    return () => {
      controls.removeEventListener('objectChange', handleObjectChange)
      controls.removeEventListener('dragging-changed', handleDraggingChanged)
    }
  }, [selectedObject])

  if (!targetObject || !selectedObject) return null

  return (
    <TransformControls
      ref={transformControlsRef}
      object={targetObject}
      mode={transformMode}
      camera={camera}
      gl={gl}
      size={1}
    />
  )
}
