/**
 * Типы процедурной генерации террейна
 *
 * Данный файл содержит расширенные типы поверх базовой системы террейна
 * (GfxTerrainConfig/GfxTerrainOp/GfxHeightSampler) для описания спецификаций
 * процедурной генерации, пулов операций и алгоритмов размещения.
 *
 * Все расстояния и координаты — в МИРОВЫХ единицах (метрах),
 * углы — в радианах, если явно не оговорено иное.
 */

import type { GfxPerlinParams, GfxHeightSampler, GfxTerrainOp, GfxTerrainConfig } from './types'

/**
 * Расширение параметров Perlin для процедурной генерации.
 * Позволяет смещать «узор» шума без смены seed.
 */
export interface GfxProceduralPerlinParams extends GfxPerlinParams {
  /** Сдвиг шума по XZ для вариаций без смены seed: [dx, dz] */
  offset?: [number, number]
}

/**
 * Полная спецификация для процедурной генерации террейна.
 * Описывает размеры мира, базовый шум, пул операций и глобальный seed.
 */
export interface GfxProceduralTerrainSpec {
  /**
   * Габариты мира в мировых единицах (метрах). Используются как «пределы»
   * для алгоритмов размещения и построения высотной карты.
   */
  world: {
    /** Ширина мира по оси X */
    width: number
    /** Глубина мира по оси Z */
    height: number
    /** Плавный спад высот к краям (0..1, доля от края) */
    edgeFade?: number
  }

  /** Базовый шум Perlin (включая расширенный offset) */
  base: GfxProceduralPerlinParams

  /** Пул рецептов, из которых будут генерироваться операции рельефа */
  pool: GfxTerrainOpPool

  /** Глобальный сид для детерминированности */
  seed: number
}

/**
 * Глобальные настройки пула и набор рецептов операций рельефа.
 */
export interface GfxTerrainOpPool {
  global?: {
    /** Глобальный множитель интенсивности для всех операций */
    intensityScale?: number
    /** Ограничение суммарного количества операций (после развёртки рецептов) */
    maxOps?: number
  }
  /** Набор рецептов генерации различных типов рельефа */
  recipes: GfxTerrainOpRecipe[]
}

/**
 * Рецепт генерации операций для конкретного типа рельефа.
 * Один рецепт может порождать НЕСКОЛЬКО GfxTerrainOp (например, кратер/террасы/хребет).
 */
export interface GfxTerrainOpRecipe {
  /** Тип рельефа */
  kind: 'hill' | 'basin' | 'ridge' | 'valley' | 'crater' | 'plateau' | 'terrace' | 'dune'

  /**
   * Режим применения смещения высоты. 'auto' подбирает типичный режим для kind:
   * hill/ridge/dune → add; basin/valley → sub; plateau → set (или add с малым falloff);
   * crater → комбинированно; terrace → серия set/add.
   */
  mode?: 'auto' | 'add' | 'sub' | 'set'

  /** Количество операций (фиксированное или диапазон) */
  count: number | [number, number]

  /** Алгоритм размещения центров операций */
  placement: GfxPlacementSpec

  /** Базовый радиус в метрах (фиксированный или диапазон) для эллиптической формы */
  radius: number | [number, number]

  /** Отношение Rz/Rx; по умолчанию 1 (круг) */
  aspect?: [number, number]

  /** Амплитуда изменения высоты (фиксированная или диапазон) */
  intensity: number | [number, number]

  /** Разброс угла поворота (в радианах), если релевантно */
  rotation?: [number, number]

  /** Функция затухания эффекта по краям */
  falloff?: 'smoothstep' | 'gauss' | 'linear'

  /**
   * Предпочтения по рельефу (высота/уклон/избежание пересечений).
   * Применяются как «веса» к выборке кандидатов, не как жёсткий фильтр.
   */
  bias?: GfxBiasSpec

  /** Случайный сдвиг центров (дрожание) */
  jitter?: { center?: number }

  /** Шаг вдоль линии (для "stroke"‑размещения), в метрах */
  step?: number
}

/**
 * Алгоритмы размещения центров операций.
 * Координаты XZ — в мировых единицах; генерация детерминирована сидом генератора.
 */
export type GfxPlacementSpec =
  | { type: 'uniform' }
  | { type: 'poisson', minDistance: number }
  | { type: 'gridJitter', cell: number, jitter?: number }
  | { type: 'ring', center: [number, number], rMin: number, rMax: number }

/**
 * Параметры «предпочтений» для отбора точек размещения.
 * min/max — допустимые интервалы, weight — сила влияния на вероятность.
 */
export interface GfxBiasSpec {
  /** Фильтр по высоте (в метрах) */
  preferHeight?: { min?: number, max?: number, weight?: number }
  /** Фильтр по уклону (в радианах) */
  preferSlope?: { min?: number, max?: number, weight?: number }
  /** Избегать пересечений с существующими и уже выбранными операциями */
  avoidOverlap?: boolean
}

/**
 * Геометрическая область, внутри которой разрешено размещение операций.
 */
export type GfxPlacementArea =
  | { kind: 'rect', x: number, y: number, width: number, height: number }
  | { kind: 'circle', x: number, y: number, radius: number }

/**
 * Дополнительные опции для генерации пула операций.
 * Позволяют ограничить область и прокинуть внешний сэмплер высот.
 */
export interface GfxOpsGenerationOptions {
  /** Ограничение по области генерации */
  area?: GfxPlacementArea
  /** Внешний сэмплер высот для bias-фильтров и проверки пересечений */
  sampler?: GfxHeightSampler
}

// Пустые экспорты, чтобы облегчить импорт потребителям API и подсветку IDE
export type { GfxTerrainOp, GfxTerrainConfig }
