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
export function getPrimitiveIcon(
  primitive: GfxPrimitive | GfxPrimitive['type']
): Icon {
  const type = typeof primitive === 'string' ? primitive : primitive.type
  switch (type) {
    case 'box':
      return IconCube
    case 'cone':
      return IconCone
    case 'pyramid':
      return IconPyramid
    case 'sphere':
    case 'leaf':
      return IconSphere
    case 'cylinder':
    case 'trunk':
    case 'branch':
      return IconCylinder
    case 'plane':
      return IconSquare
    case 'torus':
      return IconCircle
    case 'mesh':
      // Пользовательская произвольная геометрия — отображаем как куб по умолчанию
      return IconCube
    default:
      assertNever(type)
      return IconCube
  }
}

/**
 * Проверяет, что перечисление типов примитивов исчерпывающее.
 * Выбрасывает ошибку на этапе выполнения, если встречен неизвестный тип.
 */
function assertNever(x: never): never {
  throw new Error(`Неизвестный тип примитива: ${x}`)
}
