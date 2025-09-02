/**
 * Shared types - главный barrel export
 * 
 * Централизованный экспорт всех shared типов:
 * - Core utility types
 * - UI types  
 * - API types
 */

// Core utilities
export * from './core'

// UI types
export * from './ui'

// Material types доступны на уровне shared
export type {
  GfxMaterial,
  CreateGfxMaterial,
  GlobalMaterialType,
} from '@/entities/material'

// Keep backward compatibility with existing structure
export type { Vector3 } from './vector3'
export type { Transform } from './transform'
export type { BoundingBox, BoundingBoxDimensions } from './boundingBox'
export type { Point2, Size2D, Rect2D, Circle2D, BoundRect2D } from './geo2d'
