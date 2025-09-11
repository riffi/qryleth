import React from 'react'
import {
  resolveMaterial,
  materialToThreePropsWithPalette,
  getMeshPropsFromMaterial
} from '@/shared/lib/materials'
import type { GlobalPalette } from '@/entities/palette'
import { paletteRegistry } from '@/shared/lib/palette'
import { Box3D } from './Box3D'
import { Sphere3D } from './Sphere3D'
import { Cylinder3D } from './Cylinder3D'
import { Cone3D } from './Cone3D'
import { Pyramid3D } from './Pyramid3D'
import { Plane3D } from './Plane3D'
import { Torus3D } from './Torus3D'
import type { RenderMode } from '@/shared/types/ui'
import type { GfxPrimitive } from '@/entities/primitive'
import type { GfxMaterial } from '@/entities/material'

export interface PrimitiveRendererProps {
  primitive: GfxPrimitive
  renderMode?: RenderMode
  userData?: any
  onClick?: (event: any) => void
  /** Список материалов, принадлежащих объекту */
  objectMaterials?: GfxMaterial[]
  /** Активная палитра (опционально). Если не передана — используется 'default'. */
  activePalette?: GlobalPalette
}

/**
 * Рендерит примитив сцены, разрешая материал по UUID
 * и применяя вычисленные свойства к мешу и материалу.
 */
export const PrimitiveRenderer: React.FC<PrimitiveRendererProps> = ({
  primitive,
  renderMode = 'solid',
  userData,
  onClick,
  objectMaterials,
  activePalette
}) => {
  const material = resolveMaterial({
    directMaterial: primitive.material,
    objectMaterialUuid: primitive.objectMaterialUuid,
    globalMaterialUuid: primitive.globalMaterialUuid,
    objectMaterials
  })
  // Выбираем палитру: переданную или по умолчанию
  const palette = activePalette || paletteRegistry.get('default')

  const baseMaterialProps = {
    ...materialToThreePropsWithPalette(material, palette),
    wireframe: renderMode === 'wireframe'
  }


  const meshProps = {
    position: primitive.transform?.position || [0, 0, 0],
    rotation: primitive.transform?.rotation || [0, 0, 0],
    scale: primitive.transform?.scale || [1, 1, 1],
    ...getMeshPropsFromMaterial(material),
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
    case 'leaf':
      return (
        <Sphere3D
          primitive={primitive}
          materialProps={baseMaterialProps}
          meshProps={meshProps}
        />
      )

    case 'cylinder':
    case 'trunk':
    case 'branch':
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
