/**
 * Доменные типы окружения сцены новой архитектуры.
 *
 * Окружение объединяет метеопараметры (ветер), параметры визуализации неба/тумана/
 * экспозиции, а также наборы облаков ({@link GfxCloudSet}). Содержимое окружения
 * хранится в контейнере, привязанном к единственному слою типа Environment через `layerId`.
 */

import type { GfxCloudItem, GfxCloudAppearanceMeta } from '@/entities/cloud'

/**
 * Набор облаков, объединённый общими метапараметрами/происхождением.
 * @property id — уникальный идентификатор набора облаков в пределах слоя
 * @property items — список облаков (детали см. {@link GfxCloudItem})
 * @property meta — необязательные метаданные (seed, appearance) для повторной генерации
 */
export interface GfxCloudSet {
  id: string
  items: GfxCloudItem[]
  meta?: {
    seed?: number
    appearance?: GfxCloudAppearanceMeta
  }
}

/**
 * Параметры ветра в плоскости XZ.
 * @property direction — нормализованное направление [x, z]
 * @property speed — скорость дрейфа (юниты/сек)
 */
export interface GfxWindSettings {
  direction: [number, number]
  speed: number
}

/**
 * Описание тумана сцены.
 * Поля согласованы с текущей моделью освещения, но переносятся в окружение.
 */
export interface GfxFogSettings {
  enabled: boolean
  type: 'linear' | 'exponential'
  color: string
  near?: number
  far?: number
  density?: number
}

/**
 * Параметры неба/фона. Конкретные поля могут быть расширены по мере развития.
 */
export interface GfxSkySettings {
  /** Цвет фона (если skybox/проц. небо не используется) */
  backgroundColor?: string
  /** Тип неба: плоский цвет | процедурное небо | HDRI */
  type?: 'color' | 'procedural' | 'hdri'
  /** Параметры процедурного неба (расширяются по мере необходимости) */
  procedural?: {
    turbidity?: number
    rayleigh?: number
    mieCoefficient?: number
    mieDirectionalG?: number
    elevation?: number
    azimuth?: number
  }
  /** Ссылка/идентификатор HDRI, если используется */
  hdriRef?: string
}

/**
 * Контейнер содержимого окружения сцены, привязанный к слою Environment.
 * @property layerId — идентификатор единственного слоя окружения
 * @property cloudSets — наборы облаков
 * @property wind — параметры ветра в XZ
 * @property sky — параметры неба/фона
 * @property fog — параметры тумана
 * @property exposure — экспозиция сцены
 */
export interface GfxEnvironmentContent {
  /** Наборы облаков окружения */
  cloudSets: GfxCloudSet[]
  /** Параметры ветра */
  wind?: GfxWindSettings
  /** Параметры неба/фона */
  sky?: GfxSkySettings
  /** Параметры тумана */
  fog?: GfxFogSettings
  /** Экспозиция сцены */
  exposure?: number
}
