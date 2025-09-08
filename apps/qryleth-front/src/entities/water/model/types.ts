/**
 * Доменные типы для подсистемы воды в новой архитектуре.
 *
 * Вода представляется как набор водных объектов (водоёмов) внутри водного слоя.
 * Каждый водоём описывается типом {@link GfxWaterBody} и хранится в контейнере
 * содержимого сцены, привязанном к тонкому слою через его `layerId`.
 */

import type { GfxWaterConfig } from '@/entities/layer'
import type { Point2 } from '@/shared/types'

/**
 * Геометрия проекции водной поверхности на плоскость XZ.
 * Позволяет описывать море (большая область), озёра (замкнутые полигоны),
 * реки (узкие полигоны/полосы, наборы сегментов) и пр.
 */
export type GfxWaterSurface =
  | ({ kind: 'rect' } & import('@/shared/types').Rect2D)
  | ({ kind: 'circle' } & import('@/shared/types').Circle2D)
  | { kind: 'polygon'; points: Array<Point2> }

/**
 * Водоём (водный объект) в сцене.
 * @property id — уникальный идентификатор водоёма в пределах слоя
 * @property kind — вид водоёма: море, озеро или река
 * @property surface — геометрия области на плоскости XZ
 * @property altitudeY — уровень поверхности воды (высота Y)
 * @property water — параметры визуализации воды (яркость, тип шейдера и т.п.)
 */
export interface GfxWaterBody {
  id: string
  /** Человекочитаемое имя водного объекта (для UI) */
  name?: string
  /**
   * Признак видимости водного объекта.
   * Если не задано, по умолчанию true. Используется UI и рендером воды.
   */
  visible?: boolean
  kind: 'sea' | 'lake' | 'river'
  surface: GfxWaterSurface
  altitudeY: number
  water: GfxWaterConfig
}
