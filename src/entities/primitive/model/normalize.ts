import type { GfxPrimitive, LegacyGfxPrimitive } from './types'

/** Проверяет, является ли объект устаревшим примитивом */
function isLegacyPrimitive(p: GfxPrimitive | LegacyGfxPrimitive): p is LegacyGfxPrimitive {
  return !('geometry' in p)
}

// Нормализует параметры примитива.
// Если цилиндр создан без radiusTop и radiusBottom,
// копирует значение radius в оба поля.
/**
 * Нормализует примитив, преобразуя устаревший формат в новый и
 * заполняя отсутствующие параметры цилиндра.
 *
 * @param primitive примитив в любом поддерживаемом формате
 * @returns примитив в новом формате {@link GfxPrimitive}
 */
export function normalizePrimitive(
  primitive: GfxPrimitive | LegacyGfxPrimitive
): GfxPrimitive {
  if (isLegacyPrimitive(primitive)) {
    const common = {
      uuid: primitive.uuid,
      name: primitive.name,
      material:
        primitive.color ||
        primitive.opacity !== undefined ||
        primitive.emissive ||
        primitive.emissiveIntensity !== undefined
          ? {
              color: primitive.color,
              opacity: primitive.opacity,
              emissive: primitive.emissive,
              emissiveIntensity: primitive.emissiveIntensity
            }
          : undefined,
      transform:
        primitive.position || primitive.rotation || primitive.scale
          ? {
              position: primitive.position,
              rotation: primitive.rotation,
              scale: primitive.scale
            }
          : undefined
    }

    switch (primitive.type) {
      case 'box':
        return {
          type: 'box',
          geometry: {
            width: primitive.width ?? 1,
            height: primitive.height ?? 1,
            depth: primitive.depth ?? 1
          },
          ...common
        }
      case 'sphere':
        return {
          type: 'sphere',
          geometry: { radius: primitive.radius ?? 0.5 },
          ...common
        }
      case 'cylinder':
        return {
          type: 'cylinder',
          geometry: {
            radiusTop: primitive.radiusTop ?? primitive.radius ?? 0.5,
            radiusBottom: primitive.radiusBottom ?? primitive.radius ?? 0.5,
            height: primitive.height ?? 1,
            radialSegments: primitive.radialSegments
          },
          ...common
        }
      case 'cone':
        return {
          type: 'cone',
          geometry: {
            radius: primitive.radius ?? 0.5,
            height: primitive.height ?? 1,
            radialSegments: primitive.radialSegments
          },
          ...common
        }
      case 'pyramid':
        return {
          type: 'pyramid',
          geometry: {
            baseSize: primitive.baseSize ?? 1,
            height: primitive.height ?? 1
          },
          ...common
        }
      case 'plane':
        return {
          type: 'plane',
          geometry: {
            width: primitive.width ?? 1,
            height: primitive.height ?? 1
          },
          ...common
        }
      case 'torus':
        return {
          type: 'torus',
          geometry: {
            majorRadius: primitive.majorRadius ?? 1,
            minorRadius: primitive.minorRadius ?? 0.5,
            radialSegments: primitive.radialSegments,
            tubularSegments: primitive.tubularSegments
          },
          ...common
        }
    }
  }

  // Дополнительная нормализация цилиндра в новом формате
  if (
    primitive.type === 'cylinder' &&
    'geometry' in primitive &&
    (primitive.geometry as any).radius !== undefined &&
    primitive.geometry.radiusTop === undefined &&
    primitive.geometry.radiusBottom === undefined
  ) {
    return {
      ...primitive,
      geometry: {
        ...primitive.geometry,
        radiusTop: (primitive.geometry as any).radius,
        radiusBottom: (primitive.geometry as any).radius
      }
    }
  }

  return primitive as GfxPrimitive
}
