import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { CompositeObjectProps } from '../../../types/r3f'
import { PrimitiveRenderer } from '../../../shared/r3f/primitives/PrimitiveRenderer'
import { useRenderMode } from '../../../stores/sceneStore'

export const CompositeObject: React.FC<CompositeObjectProps> = ({
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
  const renderMode = useRenderMode()

  const handleClick = (event: any) => {
    event.stopPropagation()
    if (onClick) {
      onClick({
        objectUuid: placement.objectUuid,
        instanceId: `${placement.objectUuid}-${placement.uuid}`,
        placementIndex,
        point: event.point,
        object: event.object
      })
    }
  }

  const handlePointerOver = (event: any) => {
    event.stopPropagation()
    if (onHover) {
      onHover({
        objectUuid: placement.objectUuid,
        instanceId: `${placement.objectUuid}-${placement.uuid}`,
        placementIndex,
        object: event.object
      })
    }
  }

  const handlePointerOut = (event: any) => {
    event.stopPropagation()
    // Clear hover - this could be handled by parent component
  }

  // Update transform callback when object moves
  useFrame(() => {
    if (groupRef.current && onTransform) {
      const position = groupRef.current.position
      const rotation = groupRef.current.rotation
      const scale = groupRef.current.scale

      // Only call onTransform if position/rotation/scale changed
      // This would need proper change detection in a real implementation
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
        objectUuid: placement.objectUuid,
        placementUuid: placement.uuid,
        placementIndex: placementIndex,
        layerId: sceneObject.layerId || 'objects'
      }}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {sceneObject.primitives.map((primitive, index) => (
        <PrimitiveRenderer
          key={index}
          primitive={primitive}
          renderMode={renderMode}
        />
      ))}
    </group>
  )
}
