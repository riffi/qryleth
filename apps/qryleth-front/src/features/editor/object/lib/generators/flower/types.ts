/**
 * Параметры процедурной генерации пучка цветов для ObjectEditor.
 * Включает листья (похожие на травинки), стебли по CatmullRomCurve и три типа соцветий.
 */
export interface FlowerGeneratorParams {
  /** Сид случайности для детерминизма */
  seed: number
  /** Количество стеблей в пучке */
  stems: number
  /** Базовая высота стебля */
  stemHeight: number
  /** Разброс высоты стебля (0..1) */
  stemHeightJitter?: number
  /** Базовый радиус стебля у основания (в метрах) */
  stemRadius: number
  /** Кол-во сегментов по длине стебля (больше — плавнее) */
  stemSegments?: number
  /** Амплитуда изгиба стебля (0..1) */
  stemBend?: number
  /** Радиус разброса корней стеблей (XZ) */
  stemBaseSpread: number

  /** Количество листьев у основания (аналог травинок) */
  leaves: number
  /** Длина листа */
  leafLength: number
  /** Половина ширины листа у основания */
  leafHalfWidth: number
  /** Сужение листа к концу (0..1) */
  leafTaper?: number
  /** Изгиб листа (0..1) */
  leafBend?: number

  /** Тип головки цветка */
  headType: 'daisy' | 'bell' | 'hydrangea'
  /** Общий радиус головки/соцветия (базовый размер) */
  headRadius: number
  /** Количество лепестков (для типов с лепестками) */
  petals?: number
  /** Длина лепестка (для типов с лепестками) */
  petalLength?: number
  /** Полу‑ширина лепестка у основания */
  petalHalfWidth?: number
  /** Сужение лепестка к концу (0..1) */
  petalTaper?: number
  /** Изгиб лепестка (0..1) */
  petalBend?: number

  /** Кол-во сфер в «колокольчике» */
  bellSpheres?: number
  /** Кол-во сфер в «гортензии» */
  hydrangeaSpheres?: number
}

/** Материалы для частей цветка: листья, стебли, сферы, лепестки. */
export interface FlowerMaterialUuids {
  leavesMaterialUuid: string
  stemMaterialUuid: string
  sphereMaterialUuid: string
  petalMaterialUuid: string
}

