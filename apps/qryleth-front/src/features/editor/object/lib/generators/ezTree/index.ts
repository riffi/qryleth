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
import oakSmall from './presets/oak_small.json'
import oakMedium from './presets/oak_medium.json'
import pineSmall from './presets/pine_small.json'
import pineMedium from './presets/pine_medium.json'
import bush1 from './presets/bush_1.json'

export const TreePreset: Record<string, any> = {
  'Oak Small': oakSmall,
  'Oak Medium': oakMedium,
  'Pine Small': pineSmall,
  'Pine Medium': pineMedium,
  'Bush 1': bush1,
}
