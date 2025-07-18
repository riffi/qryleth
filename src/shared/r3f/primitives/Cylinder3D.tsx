import React from 'react'
import type {ScenePrimitive} from "../../../entities/primitive/model/types.ts";


interface Cylinder3DProps {
  primitive: ScenePrimitive
  materialProps: any
  meshProps: any
}

export const Cylinder3D: React.FC<Cylinder3DProps> = ({ primitive, materialProps, meshProps }) => {
  const radiusTop = primitive.radiusTop || 1
  const radiusBottom = primitive.radiusBottom || 1
  const height = primitive.height || 2
  const radialSegments = primitive.radialSegments || 16

  return (
    <mesh {...meshProps}>
      <cylinderGeometry args={[radiusTop, radiusBottom, height, radialSegments]} />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  )
}
