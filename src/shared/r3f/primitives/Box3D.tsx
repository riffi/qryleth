import React from 'react'
import type {Primitive} from "../../../entities/primitive/model/types.ts";


interface Box3DProps {
  primitive: Primitive
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
