/**
 * Параметры процедурной генерации травы (пучок клинков без текстур).
 * Генератор создаёт единый mesh, содержащий ленты-клинки с изгибом.
 */
export interface GrassGeneratorParams {
  /** Сид случайности для детерминированной генерации */
  seed: number
  /** Количество клинков (травинок) в пучке */
  blades: number
  /** Базовая высота травинки (в единицах сцены) */
  bladeHeight: number
  /** Разброс высоты (0..1): 0 — одинаковые, 1 — до ±35% от базовой */
  bladeHeightJitter?: number
  /** Базовая половина ширины у основания (толщина ленты) */
  bladeHalfWidth: number
  /** Степень сужения к верху (0..1): 0 — постоянная ширина, 1 — к вершине стремится к нулю */
  bladeTaper?: number
  /** Сила изгиба (0..1): 0 — прямые, 1 — выраженная дуга */
  bendStrength?: number
  /** Кол-во сегментов по высоте одной травинки (>=2) */
  segments?: number
  /** Радиус рассеивания оснований травинок вокруг центра (в плоскости XZ) */
  clumpRadius: number
  /**
   * Смещение плоскостей трипланарного LOD2 вдоль их локальной нормали (в метрах).
   * Применяется только к LOD‑представлению (Object/Scene), на меш не влияет.
   */
  lod2Offset?: number
}

/** Результат генерации травы: единый меш и базовый материал. */
export interface GrassGeneratorResult {
  primitives: import('@/entities/primitive').GfxPrimitive[]
  materials: import('@/entities/material').CreateGfxMaterial[]
}

