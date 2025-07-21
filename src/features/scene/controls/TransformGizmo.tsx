import React, { useRef, useEffect } from 'react'
import { TransformControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useSceneStore } from '../store/sceneStore'
import { useObjectSelection } from '../../../hooks/r3f/useObjectSelection'
import type {
  ObjectTransformEvent,
  SelectedObject,
  TransformMode
} from '../../../entities/r3f/types'

export interface ObjectTransformGizmoProps {
  selectedObject?: SelectedObject
  transformMode: TransformMode
  onTransform?: (event: ObjectTransformEvent) => void
}

export const TransformGizmo: React.FC<ObjectTransformGizmoProps> = ({ onTransform }) => {
  const { scene, camera, gl, controls } = useThree()
  const transformControlsRef = useRef<any>()
  const selectedObject = useSceneStore(state => state.selectedObject)
  const transformMode = useSceneStore(state => state.transformMode)
  const updateObjectInstance = useSceneStore(state => state.updateObjectInstance)
  const markSceneAsModified = useSceneStore(state => state.markSceneAsModified)
  const { selectedObjects } = useObjectSelection()

  // Find the target object for transform controls
  const targetObject = selectedObjects.length > 0 ? selectedObjects[0] : undefined

  const handleObjectChange = () => {
    if (!transformControlsRef.current?.object || !selectedObject) return

    const obj = transformControlsRef.current.object
    const position = obj.position
    const rotation = obj.rotation
    const scale = obj.scale

    // Update the object instance in the store
    if (selectedObject.objectInstanceIndex !== undefined) {
      updateObjectInstance(selectedObject.objectInstanceIndex, {
        position: [position.x, position.y, position.z],
        rotation: [rotation.x, rotation.y, rotation.z],
        scale: [scale.x, scale.y, scale.z]
      })
    }

    // Call external transform handler if provided
    if (onTransform) {
      onTransform({
        objectIndex: selectedObject.objectIndex,
        instanceId: selectedObject.instanceId,
        objectInstanceIndex: selectedObject.objectInstanceIndex,
        position: [position.x, position.y, position.z],
        rotation: [rotation.x, rotation.y, rotation.z],
        scale: [scale.x, scale.y, scale.z]
      })
    }
  }

  const handleDraggingChanged = (event: any) => {
    // Disable camera controls while dragging
    if (controls && 'enabled' in controls) {
      ;(controls as any).enabled = !event.value
    }

    // Save to history and mark as modified when dragging ends
    if (!event.value) {
      markSceneAsModified()
      // Save to history would be called here
      useSceneStore.getState().saveToHistory()
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

  // Don't render if no object is selected
  if (!targetObject || !selectedObject) {
    return null
  }

  return (
    <TransformControls
      ref={transformControlsRef}
      object={targetObject}
      mode={transformMode}
      camera={camera}
      gl={gl}
      size={1}
      showX={true}
      showY={true}
      showZ={true}
      space="world"
      translationSnap={null}
      rotationSnap={null}
      scaleSnap={null}
    />
  )
}
