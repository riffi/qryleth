import React, { useRef, useEffect, useMemo } from 'react'
import { TransformControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '@/features/scene'

interface InstancedObjectTransformProps {
  selectedObjectUuid: string
  selectedInstanceUuid: string
  transformMode: 'translate' | 'rotate' | 'scale'
  onTransformChange: (instanceUuid: string, transform: {
    position: [number, number, number]
    rotation: [number, number, number]
    scale: [number, number, number]
  }) => void
}

/**
 * Компонент для трансформации отдельных инстансов в InstancedMesh
 * Создаёт вспомогательный объект, который представляет выбранный инстанс
 */
export const InstancedObjectTransform: React.FC<InstancedObjectTransformProps> = ({
  selectedObjectUuid,
  selectedInstanceUuid,
  transformMode,
  onTransformChange
}) => {
  const { scene, camera, gl, controls } = useThree()
  const transformControlsRef = useRef<any>()
  const helperObjectRef = useRef<THREE.Object3D>()
  const selectedObject = useSceneStore(state => state.selectedObject)
  const objectInstances = useSceneStore(state => state.objectInstances)

  // Найти выбранный инстанс объекта
  const selectedInstance = useMemo(() => {
    return objectInstances.find(instance => 
      instance.uuid === selectedInstanceUuid && 
      instance.objectUuid === selectedObjectUuid
    )
  }, [objectInstances, selectedInstanceUuid, selectedObjectUuid])

  // Создать вспомогательный объект для TransformControls
  const helperObject = useMemo(() => {
    if (!selectedInstance) return null
    
    const helper = new THREE.Object3D()
    const transform = selectedInstance.transform || {}
    
    helper.position.fromArray(transform.position || [0, 0, 0])
    helper.rotation.fromArray(transform.rotation || [0, 0, 0])
    helper.scale.fromArray(transform.scale || [1, 1, 1])
    
    return helper
  }, [selectedInstance])

  // Обновить позицию вспомогательного объекта при изменении инстанса
  useEffect(() => {
    if (!helperObject || !selectedInstance) return
    
    const transform = selectedInstance.transform || {}
    helperObject.position.fromArray(transform.position || [0, 0, 0])
    helperObject.rotation.fromArray(transform.rotation || [0, 0, 0])
    helperObject.scale.fromArray(transform.scale || [1, 1, 1])
  }, [selectedInstance, helperObject])

  const handleTransformChange = () => {
    if (!helperObject || !selectedInstanceUuid || !transformControlsRef.current?.object) return

    const obj = transformControlsRef.current.object
    const position = obj.position
    const rotation = obj.rotation
    const scale = obj.scale

    onTransformChange(selectedInstanceUuid, {
      position: [position.x, position.y, position.z],
      rotation: [rotation.x, rotation.y, rotation.z],
      scale: [scale.x, scale.y, scale.z]
    })
  }

  const handleDraggingChanged = (event: any) => {
    // Отключить управление камерой во время перетаскивания
    if (controls && 'enabled' in controls) {
      ;(controls as any).enabled = !event.value
    }

    // Вызвать handleTransformChange только при завершении перетаскивания
    if (!event.value) {
      handleTransformChange()
    }
  }

  useEffect(() => {
    const transformControls = transformControlsRef.current
    if (!transformControls) return

    transformControls.addEventListener('dragging-changed', handleDraggingChanged)

    return () => {
      transformControls.removeEventListener('dragging-changed', handleDraggingChanged)
    }
  }, [selectedInstance])

  // Не рендерить, если нет выбранного инстанса или если объект не инстансирован
  if (!selectedInstance || !helperObject || !selectedObject?.isInstanced) {
    return null
  }

  return (
    <>
      {/* Вспомогательный объект для TransformControls */}
      <primitive
        ref={helperObjectRef}
        object={helperObject}
        visible={false}
      />
      
      {/* TransformControls для управления вспомогательным объектом */}
      <TransformControls
        ref={transformControlsRef}
        object={helperObject}
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
    </>
  )
}