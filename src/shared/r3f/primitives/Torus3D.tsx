import React from 'react'
import type {GfxPrimitive} from '@/entities/primitive';


interface Torus3DProps {
  primitive: GfxPrimitive
  materialProps: any
  meshProps: any
}

export const Torus3D: React.FC<Torus3DProps> = ({ primitive, materialProps, meshProps }) => {
  const majorRadius = primitive.majorRadius || 1
  const minorRadius = primitive.minorRadius || 0.2
  const radialSegments = primitive.radialSegments || 16
  const tubularSegments = primitive.tubularSegments || 32

  // Apply default rotation to match Blender's torus orientation (lying flat)
  // Add π/2 rotation around X-axis to existing rotation
  const originalRotation = primitive.rotation || [0, 0, 0]
  const adjustedRotation = [
    originalRotation[0] + Math.PI / 2,
    originalRotation[1],
    originalRotation[2]
  ]

  const adjustedMeshProps = {
    ...meshProps,
    rotation: adjustedRotation
  }

  return (
      <mesh {...adjustedMeshProps}>
        <torusGeometry args={[majorRadius, minorRadius, radialSegments, tubularSegments]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
  )
}
