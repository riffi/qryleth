import React, { useRef, useEffect } from 'react'
import { TransformControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useObjectStore } from '../../store/objectStore'
import { useOEPrimitiveSelection } from '../../../../hooks/objectEditor/useOEPrimitiveSelection.ts'
import type {
  PrimitiveTransformGizmoProps
} from '../../../../entities/r3f/types'

export const ObjectTransformGizmo: React.FC<PrimitiveTransformGizmoProps & { orbitControlsRef?: React.RefObject<any> }> = ({ onTransform, orbitControlsRef }) => {
  const { camera, gl } = useThree()
  const transformControlsRef = useRef<any>()
  const selectedPrimitiveId = useObjectStore(state => state.selectedPrimitiveId)
  const transformMode = useObjectStore(state => state.transformMode)
  const updatePrimitive = useObjectStore(state => state.updatePrimitive)
  const { selectedObjects } = useOEPrimitiveSelection()

  const targetObject = selectedObjects.length > 0 ? selectedObjects[0] : undefined

  const handlePrimitiveChange = () => {
    if (!transformControlsRef.current?.object || selectedPrimitiveId === null) return
    const obj = transformControlsRef.current.object
    const position = obj.position
    const rotation = obj.rotation
    const scale = obj.scale

    // Update primitive for the selected object
    updatePrimitive(selectedPrimitiveId, {
      position: [position.x, position.y, position.z],
      rotation: [rotation.x, rotation.y, rotation.z],
      scale: [scale.x, scale.y, scale.z]
    })

    onTransform?.({
      primitiveIndex: selectedPrimitiveId,
      position: [position.x, position.y, position.z],
      rotation: [rotation.x, rotation.y, rotation.z],
      scale: [scale.x, scale.y, scale.z]
    })
  }

  const handleDraggingChanged = (event: any) => {
    if (orbitControlsRef?.current) {
      orbitControlsRef.current.enabled = !event.value
    }
  }

  const handleMouseDown = () => {
    if (orbitControlsRef?.current) {
      orbitControlsRef.current.enabled = false
    }
  }

  const handleMouseUp = () => {
    if (orbitControlsRef?.current) {
      orbitControlsRef.current.enabled = true
    }
  }

  useEffect(() => {
    const controls = transformControlsRef.current
    if (!controls) return

    controls.addEventListener('objectChange', handlePrimitiveChange)
    controls.addEventListener('dragging-changed', handleDraggingChanged)
    controls.addEventListener('mouseDown', handleMouseDown)
    controls.addEventListener('mouseUp', handleMouseUp)

    return () => {
      controls.removeEventListener('objectChange', handlePrimitiveChange)
      controls.removeEventListener('dragging-changed', handleDraggingChanged)
      controls.removeEventListener('mouseDown', handleMouseDown)
      controls.removeEventListener('mouseUp', handleMouseUp)
    }
  }, [selectedPrimitiveId, orbitControlsRef])

  if (selectedPrimitiveId === null) return null

  return (
    <TransformControls
      ref={transformControlsRef}
      object={targetObject}
      mode={transformMode}
      camera={camera}
      gl={gl}
      size={1}
      onDraggingChanged={(isDragging) => {
        if (orbitControlsRef?.current) {
          orbitControlsRef.current.enabled = !isDragging
        }
      }}
    />
  )
}
