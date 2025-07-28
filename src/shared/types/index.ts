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

// Keep backward compatibility with existing structure
export type { Vector3 } from './vector3'
export type { Transform } from './transform'
export type { BoundingBox, BoundingBoxDimensions } from './boundingBox'