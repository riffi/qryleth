import React from 'react'
import type {GfxPrimitive} from '@/entities/primitive';

/** Свойства компонента Cone3D */
interface Cone3DProps {
  /** Описание примитива конуса */
  primitive: GfxPrimitive
  /** Параметры материала */
  materialProps: any
  /** Дополнительные свойства меша */
  meshProps: any
}

/**
 * Компонент отрисовки конуса.
 * Использует параметры из `primitive.geometry` согласно новой структуре типов.
 */
export const Cone3D: React.FC<Cone3DProps> = ({ primitive, materialProps, meshProps }) => {
  if (primitive.type !== 'cone') {
    throw new Error('Cone3D component expects a cone primitive')
  }

  const { radius, height, radialSegments } = primitive.geometry

  return (
    <mesh {...meshProps}>
      <coneGeometry args={[radius, height, radialSegments ?? 16]} />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  )
}
