import type { Vector3 } from '@/shared/types/vector3'
import type { SceneLayer } from '@/entities/scene/types'

export type PlacementStrategy = 'Random' | 'Center' | 'Origin' | 'Custom'

export interface PlacementOptions {
  strategy: PlacementStrategy
  customPosition?: Vector3
  bounds?: {
    minX?: number
    maxX?: number
    minZ?: number
    maxZ?: number
  }
  landscapeLayer?: SceneLayer
}

export interface PlacementResult {
  position: Vector3
  strategy: PlacementStrategy
}

/**
 * Generate object placement position based on strategy
 */
export const generateObjectPlacement = (options: PlacementOptions): PlacementResult => {
  const { strategy, customPosition, bounds, landscapeLayer } = options

  // Determine bounds from landscape layer if available
  const defaultBounds = {
    minX: landscapeLayer ? -(landscapeLayer.width || 10) / 2 : -5,
    maxX: landscapeLayer ? (landscapeLayer.width || 10) / 2 : 5,
    minZ: landscapeLayer ? -(landscapeLayer.height || 10) / 2 : -5,
    maxZ: landscapeLayer ? (landscapeLayer.height || 10) / 2 : 5,
  }

  const finalBounds = { ...defaultBounds, ...bounds }

  switch (strategy) {
    case 'Random': {
      const x = Math.random() * (finalBounds.maxX - finalBounds.minX) + finalBounds.minX
      const z = Math.random() * (finalBounds.maxZ - finalBounds.minZ) + finalBounds.minZ
      return {
        position: [x, 0, z], // Y will be adjusted by correctLLMGeneratedObject
        strategy: 'Random'
      }
    }

    case 'Center': {
      return {
        position: [0, 0, 0],
        strategy: 'Center'
      }
    }

    case 'Origin': {
      return {
        position: [0, 0, 0],
        strategy: 'Origin'
      }
    }

    case 'Custom': {
      if (!customPosition) {
        console.warn('Custom placement strategy requires customPosition, falling back to Origin')
        return {
          position: [0, 0, 0],
          strategy: 'Custom'
        }
      }
      return {
        position: customPosition,
        strategy: 'Custom'
      }
    }

    default: {
      console.warn(`Unknown placement strategy: ${strategy}, falling back to Origin`)
      return {
        position: [0, 0, 0],
        strategy: 'Origin'
      }
    }
  }
}

/**
 * Get random placement within landscape bounds
 */
export const getRandomPlacement = (landscapeLayer?: SceneLayer): PlacementResult => {
  return generateObjectPlacement({
    strategy: 'Random',
    landscapeLayer
  })
}

/**
 * Get center placement
 */
export const getCenterPlacement = (): PlacementResult => {
  return generateObjectPlacement({
    strategy: 'Center'
  })
}

/**
 * Get custom placement
 */
export const getCustomPlacement = (position: Vector3): PlacementResult => {
  return generateObjectPlacement({
    strategy: 'Custom',
    customPosition: position
  })
}