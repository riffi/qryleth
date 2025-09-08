/**
 * Доменные типы для подсистемы воды в новой архитектуре.
 *
 * Вода представляется как набор водных объектов (водоёмов) внутри водного слоя.
 * Каждый водоём описывается типом {@link GfxWaterBody} и хранится в контейнере
 * содержимого сцены, привязанном к тонкому слою через его `layerId`.
 */

import type { GfxWaterConfig } from '@/entities/layer'

/**
 * Геометрия проекции водной поверхности на плоскость XZ.
 * Позволяет описывать море (большая область), озёра (замкнутые полигоны),
 * реки (узкие полигоны/полосы, наборы сегментов) и пр.
 */
export type GfxWaterSurface =
  | { kind: 'rect'; xMin: number; xMax: number; zMin: number; zMax: number }
  | { kind: 'circle'; center: [number, number]; radius: number }
  | { kind: 'polygon'; points: Array<[number, number]> }

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
