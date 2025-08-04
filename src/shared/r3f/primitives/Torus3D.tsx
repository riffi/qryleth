import React from 'react'
import type {GfxPrimitive} from '@/entities/primitive';
import type { MeshProps, MeshStandardMaterialProps } from '@react-three/fiber'


/** Свойства компонента Torus3D */
interface Torus3DProps {
  /** Описание примитива тора */
  primitive: GfxPrimitive
  /** Параметры материала */
  materialProps?: MeshStandardMaterialProps
  /** Дополнительные свойства меша */
  meshProps?: MeshProps
}

/**
 * Компонент отрисовки тора.
 * Использует параметры из `primitive.geometry` согласно новой структуре типов.
 */
export const Torus3D: React.FC<Torus3DProps> = ({ primitive, materialProps, meshProps }) => {
  if (primitive.type !== 'torus') {
    throw new Error('Torus3D component expects a torus primitive')
  }

  const { majorRadius, minorRadius, radialSegments, tubularSegments } = primitive.geometry

  // Apply default rotation to match Blender's torus orientation (lying flat)
  // Add π/2 rotation around X-axis to existing rotation
  const originalRotation = (meshProps?.rotation as [number, number, number]) || [0, 0, 0]
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
        <torusGeometry args={[majorRadius, minorRadius, radialSegments ?? 16, tubularSegments ?? 32]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
  )
}
