import React, { useRef, useEffect } from 'react'
import { TransformControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useSceneStore } from '../../../model/sceneStore.ts'
import { useMeshSelection } from '../../../lib/hooks/useMeshSelection.ts'
import type {
  SelectedObject,
  TransformMode
} from '@/shared/types/ui'

export interface ObjectTransformGizmoProps {
  selectedObject?: SelectedObject
  transformMode: TransformMode
}

export const TransformGizmo: React.FC<ObjectTransformGizmoProps> = () => {
  const { scene, camera, gl, controls } = useThree()
  const transformControlsRef = useRef<any>()
  const selectionMetadata = useSceneStore(state => state.selectedObject)
  const transformMode = useSceneStore(state => state.transformMode)
  const updateObjectInstance = useSceneStore(state => state.updateObjectInstance)
  const { selectedMeshes } = useMeshSelection()


  const handleObjectChange = () => {
    if (!transformControlsRef.current?.object || !selectionMetadata) return

    const obj = transformControlsRef.current.object
    const position = obj.position
    const rotation = obj.rotation
    const scale = obj.scale
    console.log("obj", obj)
    console.log("selectionMetadata", selectionMetadata)

    // Update the object instance in the store
    if (selectionMetadata.instanceUuid) {
      updateObjectInstance(selectionMetadata.instanceUuid, {
        transform:{
          position: [position.x, position.y, position.z],
          rotation: [rotation.x, rotation.y, rotation.z],
          scale: [scale.x, scale.y, scale.z]
        }
      })
    }

  }

  const handleDraggingChanged = (event: any) => {
    // Disable camera controls while dragging
    if (controls && 'enabled' in controls) {
      ;(controls as any).enabled = !event.value
    }

    // Call handleObjectChange only when dragging ends
    if (!event.value) {
      handleObjectChange()
    }
  }

  useEffect(() => {
    const controls = transformControlsRef.current
    if (!controls) return

    controls.addEventListener('dragging-changed', handleDraggingChanged)

    return () => {
      controls.removeEventListener('dragging-changed', handleDraggingChanged)
    }
  }, [selectionMetadata])

  // Don't render if no object is selected
  if (selectedMeshes.length === 0 || !selectionMetadata) {
    return null
  }

  return (
    <TransformControls
      ref={transformControlsRef}
      object={selectedMeshes[0]}
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
