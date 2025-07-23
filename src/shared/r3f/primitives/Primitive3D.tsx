import React from 'react'
import type {GfxPrimitive} from '@/entities/primitive';


interface Primitive3DProps {
  primitive: GfxPrimitive
}

export const Primitive3D: React.FC<Primitive3DProps> = ({ primitive }) => {
  const { type, size, material } = primitive

  // Create geometry based on primitive type
  const renderGeometry = () => {
    switch (type) {
      case 'box':
        return (
          <boxGeometry
            args={[
              size?.width || 1,
              size?.height || 1,
              size?.depth || 1
            ]}
          />
        )

      case 'sphere':
        return (
          <sphereGeometry
            args={[
              size?.radius || 0.5,
              32, 32
            ]}
          />
        )

      case 'cylinder':
        return (
          <cylinderGeometry
            args={[
              size?.radiusTop || 0.5,
              size?.radiusBottom || 0.5,
              size?.height || 1,
              32
            ]}
          />
        )

      case 'cone':
        return (
          <coneGeometry
            args={[
              size?.radius || 0.5,
              size?.height || 1,
              32
            ]}
          />
        )

      case 'pyramid':
        return (
          <coneGeometry
            args={[
              size?.baseSize || 0.5,
              size?.height || 1,
              4 // 4 sides for pyramid
            ]}
          />
        )

      case 'plane':
        return (
          <planeGeometry
            args={[
              size?.width || 1,
              size?.height || 1
            ]}
          />
        )

      default:
        return <boxGeometry args={[1, 1, 1]} />
    }
  }

  // Create material based on primitive material
  const renderMaterial = () => {
    return (
      <meshLambertMaterial
        color={material?.color || '#ffffff'}
        transparent={material?.opacity !== undefined}
        opacity={material?.opacity || 1}
        wireframe={material?.wireframe || false}
      />
    )
  }

  return (
    <mesh castShadow receiveShadow>
      {renderGeometry()}
      {renderMaterial()}
    </mesh>
  )
}
