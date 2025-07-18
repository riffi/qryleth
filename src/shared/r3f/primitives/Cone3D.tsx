import React from 'react'
import type {Primitive} from "../../../entities/primitive/model/types.ts";

interface Cone3DProps {
  primitive: Primitive
  materialProps: any
  meshProps: any
}

export const Cone3D: React.FC<Cone3DProps> = ({ primitive, materialProps, meshProps }) => {
  const radius = primitive.radius || 1
  const height = primitive.height || 2
  const radialSegments = primitive.radialSegments || 16

  return (
    <mesh {...meshProps}>
      <coneGeometry args={[radius, height, radialSegments]} />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  )
}
