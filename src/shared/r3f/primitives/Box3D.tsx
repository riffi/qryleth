import React from 'react'
import type { GfxPrimitive } from '@/entities/primitive'


interface Box3DProps {
  primitive: GfxPrimitive
  materialProps: any
  meshProps: any
}

export const Box3D: React.FC<Box3DProps> = ({ primitive, materialProps, meshProps }) => {
  if (primitive.type !== 'box') {
    throw new Error('Box3D component expects a box primitive')
  }

  const { width, height, depth } = primitive.geometry

  return (
    <mesh {...meshProps}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  )
}
