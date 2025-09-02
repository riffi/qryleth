import type { BoundingBox } from '@/shared/types/boundingBox'

/**
 * Стратегии размещения объектов в сцене.
 */
export enum PlacementStrategy {
  Random = 'Random',
  RandomNoCollision = 'RandomNoCollision',
  PlaceAround = 'PlaceAround'
}

/** Метаданные для стратегии Random размещения. */
export interface RandomMetadata {
  /** Максимальный наклон (в градусах) для автоповорота по нормали; если не задан — используется дефолт. */
  maxTerrainTiltDeg?: number
}

/** Метаданные для стратегии RandomNoCollision размещения. */
export interface RandomNoCollisionMetadata {
  /** Максимальный наклон (в градусах) для автоповорота по нормали; если не задан — используется дефолт. */
  maxTerrainTiltDeg?: number
}

/**
 * Метаданные для стратегии PlaceAround: размещение вокруг целевых инстансов.
 */
export interface PlaceAroundMetadata {
  targetInstanceUuid?: string
  targetObjectUuid?: string
  minDistance: number
  maxDistance: number
  angleOffset?: number
  distributeEvenly?: boolean
  onlyHorizontal?: boolean
  maxTerrainTiltDeg?: number
}

/**
 * Дискриминированное объединение: стратегия ↔ метаданные.
 */
export type PlacementStrategyConfig =
  | { strategy: PlacementStrategy.Random; metadata?: RandomMetadata }
  | { strategy: PlacementStrategy.RandomNoCollision; metadata?: RandomNoCollisionMetadata }
  | { strategy: PlacementStrategy.PlaceAround; metadata: PlaceAroundMetadata }

