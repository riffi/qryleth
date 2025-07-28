import React from 'react'
import type {GfxPrimitive} from '@/entities/primitive';


/** Свойства компонента Cylinder3D */
interface Cylinder3DProps {
  /** Описание примитива цилиндра */
  primitive: GfxPrimitive
  /** Параметры материала */
  materialProps: any
  /** Дополнительные свойства меша */
  meshProps: any
}

/**
 * Компонент отрисовки цилиндра.
 * Использует параметры из `primitive.geometry` согласно новой структуре типов.
 */
export const Cylinder3D: React.FC<Cylinder3DProps> = ({ primitive, materialProps, meshProps }) => {
  if (primitive.type !== 'cylinder') {
    throw new Error('Cylinder3D component expects a cylinder primitive')
  }

  const { radiusTop, radiusBottom, height, radialSegments } = primitive.geometry

  return (
    <mesh {...meshProps}>
      <cylinderGeometry args={[radiusTop, radiusBottom, height, radialSegments ?? 16]} />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  )
}
