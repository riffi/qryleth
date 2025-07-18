import React from 'react'
import * as THREE from 'three'
import { Box3D } from './Box3D'
import { Sphere3D } from './Sphere3D'
import { Cylinder3D } from './Cylinder3D'
import { Cone3D } from './Cone3D'
import { Pyramid3D } from './Pyramid3D'
import { Plane3D } from './Plane3D'
import type {PrimitiveRendererProps} from "../../../entities/r3f/types.ts";

export const PrimitiveRenderer: React.FC<PrimitiveRendererProps> = ({
  primitive,
  renderMode = 'solid',
  userData,
  onClick
}) => {
  const baseMaterialProps = {
    color: primitive.color || '#cccccc',
    transparent: primitive.opacity !== undefined && primitive.opacity < 1,
    opacity: primitive.opacity !== undefined ? Math.max(0, Math.min(1, primitive.opacity)) : 1,
    emissive: primitive.emissive ? new THREE.Color(primitive.emissive) : undefined,
    emissiveIntensity: primitive.emissiveIntensity !== undefined ? Math.max(0, primitive.emissiveIntensity) : undefined,
    wireframe: renderMode === 'wireframe'
  }

  const meshProps = {
    position: primitive.position || [0, 0, 0],
    rotation: primitive.rotation || [0, 0, 0],
    scale: primitive.scale || [1, 1, 1],
    castShadow: true,
    receiveShadow: true,
    userData: userData || {}
  }

  switch (primitive.type) {
    case 'box':
      return (
        <Box3D
          primitive={primitive}
          materialProps={baseMaterialProps}
          meshProps={meshProps}
        />
      )

    case 'sphere':
      return (
        <Sphere3D
          primitive={primitive}
          materialProps={baseMaterialProps}
          meshProps={meshProps}
        />
      )

    case 'cylinder':
      return (
        <Cylinder3D
          primitive={primitive}
          materialProps={baseMaterialProps}
          meshProps={meshProps}
        />
      )

    case 'cone':
      return (
        <Cone3D
          primitive={primitive}
          materialProps={baseMaterialProps}
          meshProps={meshProps}
        />
      )

    case 'pyramid':
      return (
        <Pyramid3D
          primitive={primitive}
          materialProps={baseMaterialProps}
          meshProps={meshProps}
        />
      )

    case 'plane':
      return (
        <Plane3D
          primitive={primitive}
          materialProps={baseMaterialProps}
          meshProps={meshProps}
        />
      )

    default:
      console.warn('Unknown primitive type:', primitive.type)
      return null
  }
}
