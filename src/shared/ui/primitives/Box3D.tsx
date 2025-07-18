import React from 'react'
import type { ScenePrimitive } from '../../../types/scene'

interface Box3DProps {
  primitive: ScenePrimitive
  materialProps: any
  meshProps: any
}

export const Box3D: React.FC<Box3DProps> = ({ primitive, materialProps, meshProps }) => {
  const width = primitive.width || 1
  const height = primitive.height || 1
  const depth = primitive.depth || 1

  return (
    <mesh {...meshProps}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  )
}