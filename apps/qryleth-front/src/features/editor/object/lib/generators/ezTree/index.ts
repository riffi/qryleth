import TreeOptions from './options'
import { Tree } from './tree'

export { TreeOptions }

/**
 * Результат генерации геометрии ez-tree: раздельные массивы для ствола/ветвей и листвы.
 */
export interface EzTreeGeometry {
  branches: { positions: number[]; normals: number[]; indices: number[]; uvs: number[] }
  leaves: { positions: number[]; normals: number[]; indices: number[]; uvs: number[] }
  /** Список экземпляров листьев для генерации примитивов 'leaf'. */
  leafInstances: { position: [number, number, number]; orientation: [number, number, number]; size: number }[]
}

/**
 * Генерирует дерево и возвращает геометрию в виде плоских массивов.
 * @param options Опции дерева (см. TreeOptions)
 */
export function generateEzTreeGeometry(options: TreeOptions): EzTreeGeometry {
  const tree = new Tree(options)
  tree.generate()
  return {
    branches: {
      positions: tree.branches.verts,
      normals: tree.branches.normals,
      indices: tree.branches.indices,
      uvs: tree.branches.uvs,
    },
    leaves: {
      positions: tree.leaves.verts,
      normals: tree.leaves.normals,
      indices: tree.leaves.indices,
      uvs: tree.leaves.uvs,
    },
    leafInstances: tree.leavesInstances.map(it => ({ position: [it.position.x, it.position.y, it.position.z], orientation: [it.orientation.x, it.orientation.y, it.orientation.z], size: it.size }))
  }
}

/**
 * Набор пресетов. Для упрощения — пустой объект (можно заполнить позже JSON‑ами под конкретные нужды).
 */
import ashSmall from './presets/ash_small.json'
import ashMedium from './presets/ash_medium.json'
import ashLarge from './presets/ash_large.json'
import aspenSmall from './presets/aspen_small.json'
import aspenMedium from './presets/aspen_medium.json'
import aspenLarge from './presets/aspen_large.json'
import bush1 from './presets/bush_1.json'
import bush2 from './presets/bush_2.json'
import bush3 from './presets/bush_3.json'
import oakSmall from './presets/oak_small.json'
import oakMedium from './presets/oak_medium.json'
import oakLarge from './presets/oak_large.json'
import pineSmall from './presets/pine_small.json'
import pineMedium from './presets/pine_medium.json'
import pineLarge from './presets/pine_large.json'

export const TreePreset: Record<string, any> = {
  'Ash Small': ashSmall,
  'Ash Medium': ashMedium,
  'Ash Large': ashLarge,
  'Aspen Small': aspenSmall,
  'Aspen Medium': aspenMedium,
  'Aspen Large': aspenLarge,
  'Bush 1': bush1,
  'Bush 2': bush2,
  'Bush 3': bush3,
  'Oak Small': oakSmall,
  'Oak Medium': oakMedium,
  'Oak Large': oakLarge,
  'Pine Small': pineSmall,
  'Pine Medium': pineMedium,
  'Pine Large': pineLarge,
}
