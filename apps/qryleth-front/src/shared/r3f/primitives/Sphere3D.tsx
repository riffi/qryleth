import React from 'react'
import type { GfxPrimitive } from '@/entities/primitive'
import type { MeshProps, MeshStandardMaterialProps } from '@react-three/fiber'


interface Sphere3DProps {
  primitive: GfxPrimitive
  materialProps?: MeshStandardMaterialProps
  meshProps?: MeshProps
}

/**
 * Компонент отрисовки сферического примитива.
 * Принимает параметры геометрии и материала и возвращает готовый меш.
 */
export const Sphere3D: React.FC<Sphere3DProps> = ({ primitive, materialProps, meshProps }) => {
  if (primitive.type !== 'sphere' && primitive.type !== 'leaf') {
    throw new Error('Sphere3D expects sphere/leaf primitive')
  }

  const { radius } = (primitive as any).geometry

  return (
    <mesh {...meshProps}>
      <sphereGeometry args={[radius, 32, 16]} />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  )
}
