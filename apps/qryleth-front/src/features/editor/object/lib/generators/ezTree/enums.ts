/**
 * Перечисления типов коры/листвы/дерева.
 * Соответствуют концепциям ez-tree, упрощённые для локального генератора.
 */
export const BarkType = {
  Birch: 'birch',
  Oak: 'oak',
  Pine: 'pine',
  Willow: 'willow',
} as const

export const Billboard = {
  Single: 'single',
  Double: 'double',
} as const

export const LeafType = {
  Ash: 'ash',
  Aspen: 'aspen',
  Pine: 'pine',
  Oak: 'oak',
} as const

export const TreeType = {
  Deciduous: 'deciduous',
  Evergreen: 'evergreen',
} as const

export type BarkTypeValue = typeof BarkType[keyof typeof BarkType]
export type BillboardValue = typeof Billboard[keyof typeof Billboard]
export type LeafTypeValue = typeof LeafType[keyof typeof LeafType]
export type TreeTypeValue = typeof TreeType[keyof typeof TreeType]

