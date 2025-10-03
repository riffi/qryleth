import { BarkType, Billboard, LeafType, TreeType, type BarkTypeValue, type BillboardValue, type LeafTypeValue, type TreeTypeValue } from './enums'

/**
 * Опции параметров дерева в стиле ez-tree. Упрощённая TS версия для локального генератора.
 */
export default class TreeOptions {
  seed: number = 0
  type: TreeTypeValue = TreeType.Deciduous

  /** Параметры коры. Текстуры не используются, цвет берётся из материала ObjectEditor. */
  bark = {
    type: BarkType.Oak as BarkTypeValue,
    tint: 0xffffff,
    flatShading: false,
    textured: false,
    textureScale: { x: 1, y: 1 },
  }

  /** Параметры ветвей. Значения по уровням, как в ez-tree. */
  branch = {
    levels: 3,
    angle: { 1: 70, 2: 60, 3: 60 } as Record<number, number>,
    children: { 0: 7, 1: 7, 2: 5 } as Record<number, number>,
    force: { direction: { x: 0, y: 1, z: 0 }, strength: 0.01 },
    gnarliness: { 0: 0.15, 1: 0.2, 2: 0.3, 3: 0.02 } as Record<number, number>,
    length: { 0: 20, 1: 20, 2: 10, 3: 1 } as Record<number, number>,
    radius: { 0: 1.5, 1: 0.7, 2: 0.7, 3: 0.7 } as Record<number, number>,
    sections: { 0: 12, 1: 10, 2: 8, 3: 6 } as Record<number, number>,
    segments: { 0: 8, 1: 6, 2: 4, 3: 3 } as Record<number, number>,
    start: { 1: 0.4, 2: 0.3, 3: 0.3 } as Record<number, number>,
    taper: { 0: 0.7, 1: 0.7, 2: 0.7, 3: 0.7 } as Record<number, number>,
    twist: { 0: 0, 1: 0, 2: 0, 3: 0 } as Record<number, number>,
  }

  /** Параметры листвы (билборды). */
  leaves = {
    type: LeafType.Oak as LeafTypeValue,
    billboard: Billboard.Double as BillboardValue,
    angle: 10,
    count: 1,
    start: 0,
    size: 2.5,
    sizeVariance: 0.7,
    tint: 0xffffff,
    alphaTest: 0.5,
  }

  /**
   * Копирует значения из source в this, только для существующих ключей (поверхностно/вложенно для объектов).
   * @param source Объект с параметрами
   */
  copy(source: any, target: any = this) {
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key) && Object.prototype.hasOwnProperty.call(target, key)) {
        if (typeof source[key] === 'object' && source[key] !== null) {
          this.copy(source[key], target[key])
        } else {
          target[key] = source[key]
        }
      }
    }
  }
}

