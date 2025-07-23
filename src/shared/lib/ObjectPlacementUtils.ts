import type {Vector3} from '@/shared/types/vector3'
import type {SceneLayer, SceneObjectInstance} from '@/entities/scene/types'

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

const queryHeightAtCoordinate = (
    layer: SceneLayer,
    worldX: number,
    worldZ: number
): number => {
  if (layer.type !== 'landscape' || layer.shape !== 'perlin' || !layer.noiseData) {
    return 0; // Default height for non-perlin landscapes
  }

  const width = layer.width || 1;
  const height = layer.height || 1;
  const segments = 64; // Same as in createPerlinGeometry

  // Convert world coordinates to noise array indices
  const noiseX = Math.floor(((worldX + width / 2) / width) * segments);
  const noiseZ = Math.floor(((worldZ + height / 2) / height) * segments);

  // Clamp to valid bounds
  const clampedX = Math.max(0, Math.min(segments, noiseX));
  const clampedZ = Math.max(0, Math.min(segments, noiseZ));

  // Get noise value
  const noiseIndex = clampedZ * (segments + 1) + clampedX;
  const noiseValue = layer.noiseData[noiseIndex] || 0;

  return noiseValue * 4; // Same multiplier as geometry creation
};

export const placeInstance = (
    instance: SceneObjectInstance,
    options?: {
      landscapeLayer?: SceneLayer;
      placementX?: number;
      placementZ?: number;
    })=> {
  const newInstance = {...instance};
  
  let placementX: number | undefined = options?.placementX;
  let placementZ: number | undefined = options?.placementZ;
  
  // If no placement coordinates provided, use random placement
  if (placementX === undefined || placementZ === undefined) {
    const randomPlacement = getRandomPlacement(options?.landscapeLayer);
    placementX = randomPlacement.position[0];
    placementZ = randomPlacement.position[2];
  }
  
  // Calculate target Y position
  let targetY = 0; // Default: place on y=0

  // If landscape layer and placement coordinates are provided, place on landscape
  if (options?.landscapeLayer) {
    targetY = queryHeightAtCoordinate(
        options.landscapeLayer,
        placementX,
        placementZ
    );
  }

  newInstance.transform = {
    ...newInstance.transform,
    position: [placementX, targetY, placementZ]
  }
  return newInstance
}
