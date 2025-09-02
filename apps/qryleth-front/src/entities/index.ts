/**
 * Entities - доменные сущности приложения
 * 
 * Barrel export всех доменных entities согласно FSD:
 * - Primitive - базовые 3D примитивы
 * - PrimitiveGroup - группы примитивов
 * - Object - 3D объекты 
 * - Layer - слои сцены
 * - ObjectInstance - экземпляры объектов
 * - Lighting - настройки освещения  
 * - Material - материалы для рендеринга
 * - Terrain - конфигурация и типы террейна
 * - Scene - сцена и ее данные
 */

// Domain entities
export * from './primitive'
export * from './primitiveGroup'
export * from './object'
export * from './layer'
export * from './objectInstance'
export * from './lighting'
export * from './material'
export * from './terrain'

// Scene types (special case - has types.ts directly)
export * from './scene/types'
// Biomes domain
export * from './biome'
