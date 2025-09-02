import React, { useRef, useEffect } from 'react'
import { TransformControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useSceneStore } from '../../../model/sceneStore.ts'
// Хук выбора мешей сцены: импорт через алиас фичи scene/lib
import { useMeshSelection } from '@/features/editor/scene/lib/hooks/useMeshSelection.ts'
import { InstancedObjectTransform } from '@/shared/r3f/optimization/InstancedObjectTransform'


export const ObjectTransformGizmo: React.FC = () => {
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

  const handleInstancedObjectTransform = (instanceUuid: string, transform: {
    position: [number, number, number]
    rotation: [number, number, number]
    scale: [number, number, number]
  }) => {
    updateObjectInstance(instanceUuid, { transform })
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
    const transformControls = transformControlsRef.current
    if (!transformControls) return

    transformControls.addEventListener('dragging-changed', handleDraggingChanged)

    return () => {
      transformControls.removeEventListener('dragging-changed', handleDraggingChanged)
    }
  }, [selectionMetadata])

  // Don't render if no object is selected
  if (!selectionMetadata) {
    return null
  }

  // Если выбран инстансированный объект, используем специальный компонент
  if (selectionMetadata.isInstanced && selectionMetadata.instanceUuid && selectionMetadata.objectUuid) {
    return (
      <InstancedObjectTransform
        selectedObjectUuid={selectionMetadata.objectUuid}
        selectedInstanceUuid={selectionMetadata.instanceUuid}
        transformMode={transformMode}
        onTransformChange={handleInstancedObjectTransform}
      />
    )
  }

  // Для обычных объектов используем стандартный TransformControls
  if (selectedMeshes.length === 0) {
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
