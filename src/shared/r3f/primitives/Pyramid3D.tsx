import React from 'react'
import type { GfxPrimitive } from '@/entities/primitive'


/** Свойства компонента Pyramid3D */
interface Pyramid3DProps {
  /** Описание примитива пирамиды */
  primitive: GfxPrimitive
  /** Параметры материала */
  materialProps: any
  /** Дополнительные свойства меша */
  meshProps: any
}

/**
 * Компонент отрисовки пирамиды.
 * Использует параметры из `primitive.geometry` согласно новой структуре типов.
 */
export const Pyramid3D: React.FC<Pyramid3DProps> = ({ primitive, materialProps, meshProps }) => {
  if (primitive.type !== 'pyramid') {
    throw new Error('Pyramid3D component expects a pyramid primitive')
  }

  const { baseSize, height } = primitive.geometry
  const radius = baseSize / Math.SQRT2

  // Pyramid is a cone with 4 sides, rotated 45 degrees
  const modifiedMeshProps = {
    ...meshProps,
    rotation: [
      (meshProps.rotation?.[0] || 0),
      (meshProps.rotation?.[1] || 0) + Math.PI / 4, // Add 45-degree rotation
      (meshProps.rotation?.[2] || 0)
    ]
  }

  return (
    <mesh {...modifiedMeshProps}>
      <coneGeometry args={[radius, height, 4]} />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  )
}
