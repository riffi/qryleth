import React from 'react'
import type {Primitive} from "../../../entities/primitive/model/types.ts";


interface Sphere3DProps {
  primitive: Primitive
  materialProps: any
  meshProps: any
}

export const Sphere3D: React.FC<Sphere3DProps> = ({ primitive, materialProps, meshProps }) => {
  const radius = primitive.radius || 1

  return (
    <mesh {...meshProps}>
      <sphereGeometry args={[radius, 32, 16]} />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  )
}
