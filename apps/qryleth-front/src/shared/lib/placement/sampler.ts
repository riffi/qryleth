import type { Vector3 } from '@/shared/types'

/**
 * Минимальный контракт семплера высот/нормалей террейна без зависимостей от entities.
 *
 * Реализации могут предоставляться на уровне feature (адаптер к GfxHeightSampler и т.п.).
 */
export interface TerrainHeightSampler {
  /** Вернуть высоту поверхности (Y) в мировой точке (X,Z). */
  getHeight(x: number, z: number): number
  /** Вернуть нормаль поверхности в мировой точке (X,Z). */
  getNormal(x: number, z: number): Vector3
  /** Необязательный колбэк о готовности heightmap-данных (если источник требует загрузки). */
  onHeightmapLoaded?(cb: () => void): void
  /** Необязательная специализация готовности источника (асинхронная инициализация). */
  ready?(): Promise<void>
}

