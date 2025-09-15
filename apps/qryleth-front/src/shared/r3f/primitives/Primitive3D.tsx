import React, { useMemo } from 'react'
import * as THREE from 'three'
import type { GfxPrimitive } from '@/entities/primitive'


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

interface Mesh3DProps {
  /** Примитив типа 'mesh' с произвольной геометрией */
  primitive: Extract<GfxPrimitive, { type: 'mesh' }>
  /** Свойства материала three.js (уже разрешённого с палитрой) */
  materialProps?: any
  /** Свойства меша three.js (позиция/вращение/скейл/теневые флаги) */
  meshProps?: any
}

/**
 * Рендер произвольной BufferGeometry из массивов позиций/нормалей/индексов.
 * Предназначено для единого меша ствола без видимых стыков.
 */
export const Mesh3D: React.FC<Mesh3DProps> = ({ primitive, materialProps, meshProps }) => {
  const geom = primitive.geometry as any

  const bufferGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(geom.positions)
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    if (geom.normals && geom.normals.length === geom.positions.length) {
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(geom.normals), 3))
    } else {
      g.computeVertexNormals()
    }
    if (geom.uvs) {
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geom.uvs), 2))
    }
    if (geom.indices) g.setIndex(geom.indices)
    g.computeBoundingSphere()
    g.computeBoundingBox()
    return g
  }, [geom.positions, geom.normals, geom.indices, geom.uvs])

  return (
    <mesh {...(meshProps || {})} castShadow receiveShadow>
      <primitive object={bufferGeometry} attach="geometry" />
      <meshStandardMaterial {...(materialProps || {})} />
    </mesh>
  )
}
