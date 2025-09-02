export type { PlacementPoint, PlacementOptions } from './PlacementAlgorithms'
export {
  placePoints,
  placeUniform,
  placePoisson,
  placeGridJitter,
  placeRing
} from './PlacementAlgorithms'
export {
  type WorldRect,
  makeWorldRect,
  areaToWorldRect,
  isInsideRect,
  isInsideArea,
  randomPointInRect,
  randomPointInCircle
} from './PlacementUtils'
// Дополнительно экспортируем общий тип 2D-границ из shared для удобства потребителей
export type { BoundRect2D } from '@/shared/types'
