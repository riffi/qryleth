import React, { useRef, useEffect } from 'react'
import { TransformControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useObjectStore } from '../../store/objectStore'
import { useOEObjectSelection } from '../../../../hooks/objectEditor/useOEObjectSelection'
import type { TransformGizmoProps } from '../../../../entities/r3f/types'

export const ObjectTransformGizmo: React.FC<TransformGizmoProps & { orbitControlsRef?: React.RefObject<any> }> = ({ onTransform, orbitControlsRef }) => {
  const { camera, gl } = useThree()
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
    
    // Update placement for the selected object
    if (selectedObject.objectIndex !== undefined) {
      updatePlacement(selectedObject.objectIndex, {
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

    controls.addEventListener('objectChange', handleObjectChange)
    controls.addEventListener('dragging-changed', handleDraggingChanged)
    controls.addEventListener('mouseDown', handleMouseDown)
    controls.addEventListener('mouseUp', handleMouseUp)

    return () => {
      controls.removeEventListener('objectChange', handleObjectChange)
      controls.removeEventListener('dragging-changed', handleDraggingChanged)
      controls.removeEventListener('mouseDown', handleMouseDown)
      controls.removeEventListener('mouseUp', handleMouseUp)
    }
  }, [selectedObject, orbitControlsRef])

  if (!selectedObject) return null

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
