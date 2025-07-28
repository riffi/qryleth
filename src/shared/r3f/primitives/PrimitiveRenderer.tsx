import React from 'react'
import * as THREE from 'three'
import { Box3D } from './Box3D'
import { Sphere3D } from './Sphere3D'
import { Cylinder3D } from './Cylinder3D'
import { Cone3D } from './Cone3D'
import { Pyramid3D } from './Pyramid3D'
import { Plane3D } from './Plane3D'
import { Torus3D } from './Torus3D'
import type { RenderMode } from '@/shared/types/ui'
import type { GfxPrimitive } from '@/entities/primitive'

export interface PrimitiveRendererProps {
  primitive: GfxPrimitive
  renderMode?: RenderMode
  userData?: any
  onClick?: (event: any) => void
}

export const PrimitiveRenderer: React.FC<PrimitiveRendererProps> = ({
  primitive,
  renderMode = 'solid',
  userData,
  onClick
}) => {
  const baseMaterialProps = {
    color: primitive.material?.color || '#cccccc',
    transparent: primitive.material?.opacity !== undefined && primitive.material.opacity < 1,
    opacity: primitive.material?.opacity !== undefined ? Math.max(0, Math.min(1, primitive.material.opacity)) : 1,
    emissive: primitive.material?.emissive ? new THREE.Color(primitive.material.emissive) : undefined,
    emissiveIntensity: primitive.material?.emissiveIntensity !== undefined ? Math.max(0, primitive.material.emissiveIntensity) : undefined,
    wireframe: renderMode === 'wireframe'
  }

  if (primitive.type === 'torus') {
    console.log('PrimitiveRenderer torus:', { primitive, baseMaterialProps })
  }

  const meshProps = {
    position: primitive.transform?.position || [0, 0, 0],
    rotation: primitive.transform?.rotation || [0, 0, 0],
    scale: primitive.transform?.scale || [1, 1, 1],
    castShadow: true,
    receiveShadow: true,
    userData: userData || {},
    onClick: onClick
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

    case 'torus':
      return (
        <Torus3D
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
