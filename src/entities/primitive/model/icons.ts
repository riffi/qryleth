import {
  IconCube,
  IconCone,
  IconPyramid,
  IconSphere,
  IconCylinder,
  IconSquare,
  IconCircle
} from '@tabler/icons-react'
import type { GfxPrimitive } from './types'
import type { Icon } from '@tabler/icons-react'

/**
 * Возвращает React-компонент иконки в зависимости от типа примитива.
 * @param type тип примитива
 * @returns компонент иконки Tabler
 */
export function getPrimitiveIcon(type: GfxPrimitive['type']): Icon {
  switch (type) {
    case 'box':
      return IconCube
    case 'cone':
      return IconCone
    case 'pyramid':
      return IconPyramid
    case 'sphere':
      return IconSphere
    case 'cylinder':
      return IconCylinder
    case 'plane':
      return IconSquare
    case 'torus':
      return IconCircle
    default:
      return IconCube
  }
}
