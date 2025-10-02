/**
 * Параметры процедурной генерации камня (SDF + маршинг кубов).
 * Основано на тестовом проекте в папке `test/src/rocks`, адаптировано под архитектуру qryleth-front.
 */
export type RockRecipeId = 'slate' | 'boulder' | 'porous'

export type MacroWarpKind = 'taper' | 'twist' | 'bend'

/** Описание полосовой макро-деформации по высоте Y. */
export interface MacroWarpStage {
  kind: MacroWarpKind
  amount: number
  band: { y0: number; y1: number; feather?: number }
  axis?: 'x' | 'y' | 'z'
}

/** Параметры макро-формы/деформаций камня. */
export interface MacroParams {
  /** Смешивание базовой формы (0 — сфера, 1 — бокс). */
  baseBlend?: number
  /** Коэффициент сглаживания при объединении частей. */
  smoothK?: number
  /** Коническое сужение по высоте. */
  taper?: number
  /** Кручение вокруг оси Y по высоте (радианы на полную высоту). */
  twist?: number
  /** Изгиб вокруг оси X (зависит от X-нормализованной координаты). */
  bend?: number
  /** Набор «рубящих» плоскостей (пересечения с полупространством). */
  cuts?: Array<{ normal: [number, number, number]; offset: number; smoothK?: number }>
  /** Программируемые стадии деформаций в диапазонах Y. */
  program?: MacroWarpStage[]
  /** Включить лёгкую случайность стадий от seed. */
  randomizeFromSeed?: boolean
  /** Мульти-кусочная сборка валуна. */
  piecesCount?: number
  piecesSpread?: number
  piecesScaleJitter?: number
  piecesSmoothK?: number
  piecesOp?: 'union' | 'intersect' | 'subtract'
}

export interface RockGeneratorParams {
  /** Сид случайности для детерминированной генерации. */
  seed: number
  /** Размеры камня по осям (мировые единицы). */
  size: [number, number, number]
  /** Разрешение сетки сэмплирования SDF (количество ячеек по одной оси). */
  resolution: number
  /** Рецепт микро-шероховатостей. */
  recipe: RockRecipeId
  /** Макро-параметры формы. */
  macro?: MacroParams
  /** Идентификатор набора текстур камня из реестра (rockTextureRegistry). */
  rockTextureSetId?: string
  /** Повторы UV по U/V (для обычной UV-развёртки). */
  rockUvRepeatU?: number
  rockUvRepeatV?: number
  /** Включить трипланарное наложение текстур. */
  rockTriplanar?: boolean
  /** Масштаб трипланарной проекции (плиточность). */
  rockTexScale?: number
}

export interface RockGeneratorResult {
  primitives: import('@/entities/primitive').GfxPrimitive[]
  materials: import('@/entities/material').CreateGfxMaterial[]
}
