import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { CompositeObjectProps } from '../../../../types/r3f'
import { PrimitiveRenderer } from '../../primitives/PrimitiveRenderer'
import { useObjectRenderMode, useObjectStore } from '../../../../stores/objectStore'

export const ObjectCompositeObject: React.FC<CompositeObjectProps> = ({
  sceneObject,
  placement,
  placementIndex,
  isSelected = false,
  isHovered = false,
  onClick,
  onHover,
  onTransform,
  visible = true
}) => {
  const groupRef = useRef<THREE.Group>(null)
  const renderMode = useObjectRenderMode()

  const handleClick = (event: any) => {
    event.stopPropagation()
    onClick?.({
      objectIndex: placement.objectIndex,
      instanceId: `${placement.objectIndex}-${placementIndex}`,
      placementIndex,
      point: event.point,
      object: event.object
    })
  }

  const handlePointerOver = (event: any) => {
    event.stopPropagation()
    onHover?.({
      objectIndex: placement.objectIndex,
      instanceId: `${placement.objectIndex}-${placementIndex}`,
      placementIndex,
      object: event.object
    })
  }

  useFrame(() => {
    if (groupRef.current && onTransform) {
      // placeholder for future transform change detection
    }
  })

  return (
    <group
      ref={groupRef}
      name={sceneObject.name}
      position={placement.position || [0, 0, 0]}
      rotation={placement.rotation || [0, 0, 0]}
      scale={placement.scale || [1, 1, 1]}
      visible={visible}
      userData={{
        generated: true,
        objectIndex: placement.objectIndex,
        placementIndex,
        layerId: sceneObject.layerId || 'objects'
      }}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
    >
      {sceneObject.primitives.map((primitive, index) => (
        <PrimitiveRenderer key={index} primitive={primitive} renderMode={renderMode} />
      ))}
    </group>
  )
}
