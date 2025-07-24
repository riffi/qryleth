import type { GfxPrimitive } from './types'

// Нормализует параметры примитива.
// Если цилиндр создан без radiusTop и radiusBottom,
// копирует значение radius в оба поля.
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
