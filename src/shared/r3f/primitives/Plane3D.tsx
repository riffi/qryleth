import React from 'react'
import type {ScenePrimitive} from "../../../entities/primitive/model/types.ts";


interface Plane3DProps {
  primitive: ScenePrimitive
  materialProps: any
  meshProps: any
}

export const Plane3D: React.FC<Plane3DProps> = ({ primitive, materialProps, meshProps }) => {
  const width = primitive.width || 1
  const height = primitive.height || 1

  // Plane is automatically rotated to be horizontal (like in original implementation)
  const modifiedMeshProps = {
    ...meshProps,
    rotation: [
      (meshProps.rotation?.[0] || 0) - Math.PI / 2, // Add -90-degree X rotation
      (meshProps.rotation?.[1] || 0),
      (meshProps.rotation?.[2] || 0)
    ]
  }

  return (
    <mesh {...modifiedMeshProps}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial {...materialProps} side={2} /> {/* DoubleSide */}
    </mesh>
  )
}
