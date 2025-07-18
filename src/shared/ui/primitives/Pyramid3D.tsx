import React from 'react'
import type { ScenePrimitive } from '../../../types/scene'

interface Pyramid3DProps {
  primitive: ScenePrimitive
  materialProps: any
  meshProps: any
}

export const Pyramid3D: React.FC<Pyramid3DProps> = ({ primitive, materialProps, meshProps }) => {
  const baseSize = primitive.baseSize || 1
  const height = primitive.height || 2
  const radius = baseSize / 2

  // Pyramid is a cone with 4 sides, rotated 45 degrees
  const modifiedMeshProps = {
    ...meshProps,
    rotation: [
      (meshProps.rotation?.[0] || 0),
      (meshProps.rotation?.[1] || 0) + Math.PI / 4, // Add 45-degree rotation
      (meshProps.rotation?.[2] || 0)
    ]
  }

  return (
    <mesh {...modifiedMeshProps}>
      <coneGeometry args={[radius, height, 4]} />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  )
}