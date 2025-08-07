import React from 'react'
import type {GfxPrimitive} from '@/entities/primitive';


interface Plane3DProps {
  primitive: GfxPrimitive
  materialProps: any
  meshProps: any
}

export const Plane3D: React.FC<Plane3DProps> = ({ primitive, materialProps, meshProps }) => {
  if (primitive.type !== 'plane') {
    throw new Error('Plane3D component expects a plane primitive')
  }

  const { width, height } = primitive.geometry

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
