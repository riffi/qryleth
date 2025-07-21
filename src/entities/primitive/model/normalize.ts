import type { GfxPrimitive } from './types'

export function normalizePrimitive(primitive: GfxPrimitive): GfxPrimitive {
  if (
    primitive.type === 'cylinder' &&
    primitive.radius !== undefined &&
    primitive.radiusTop === undefined &&
    primitive.radiusBottom === undefined
  ) {
    return {
      ...primitive,
      radiusTop: primitive.radius,
      radiusBottom: primitive.radius
    }
  }

  return primitive
}
