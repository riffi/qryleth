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
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  // Convert world coordinates to noise array indices
  const noiseX = Math.floor(((worldX + width / 2) / width) * segments);
  const noiseZ = Math.floor(((worldZ + height / 2) / height) * segments);

  // Clamp to valid bounds
  const clampedX = Math.max(0, Math.min(segments, noiseX));
  const clampedZ = Math.max(0, Math.min(segments, noiseZ));

  // Get noise value
  const noiseIndex = clampedZ * (segments + 1) + clampedX;
  const noiseValue = layer.noiseData[noiseIndex] || 0;

  // Apply the same fade-out logic as in perlinGeometry.ts
  // Calculate distance from edges (0 at edge, 1 at center)
  const distFromLeftEdge = (worldX + halfWidth) / width;
  const distFromRightEdge = (halfWidth - worldX) / width;
  const distFromTopEdge = (worldZ + halfHeight) / height;
  const distFromBottomEdge = (halfHeight - worldZ) / height;
  
  // Find minimum distance to any edge
  const edgeDistance = Math.min(distFromLeftEdge, distFromRightEdge, distFromTopEdge, distFromBottomEdge);
  
  // Create fade-out factor (0 at edges, 1 towards center)
  const fadeOutDistance = 0.15; // 15% of the terrain from edges will fade to 0
  const fadeFactor = Math.max(0, Math.min(1, edgeDistance / fadeOutDistance));
  
  // Apply noise with fade-out effect
  let heightValue = noiseValue * 4 * fadeFactor;
  
  // Ensure edges are at 0 or below
  if (fadeFactor === 0) {
    heightValue = Math.min(0, heightValue);
  }

  return heightValue;
};

/**
 * Calculate surface normal at given coordinates for perlin terrain
 */
const calculateSurfaceNormal = (
    layer: SceneLayer,
    worldX: number,
    worldZ: number
): Vector3 => {
  if (layer.type !== 'landscape' || layer.shape !== 'perlin' || !layer.noiseData) {
    return [0, 1, 0]; // Default upward normal
  }

  const width = layer.width || 1;
  const height = layer.height || 1;
  const segments = 64;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  
  // Sample neighboring heights to calculate gradient
  // Use a larger sample distance for more stable gradient calculation
  const sampleDistance = 0.5; // Increased from 0.1 for better gradient estimation
  
  const heightCenter = queryHeightAtCoordinate(layer, worldX, worldZ);
  const heightLeft = queryHeightAtCoordinate(layer, worldX - sampleDistance, worldZ);
  const heightRight = queryHeightAtCoordinate(layer, worldX + sampleDistance, worldZ);
  const heightBack = queryHeightAtCoordinate(layer, worldX, worldZ - sampleDistance);
  const heightFront = queryHeightAtCoordinate(layer, worldX, worldZ + sampleDistance);
  
  // Calculate gradients (slopes)
  const gradientX = (heightRight - heightLeft) / (2 * sampleDistance);
  const gradientZ = (heightFront - heightBack) / (2 * sampleDistance);
  
  // Calculate normal vector using cross product method
  // Create two tangent vectors on the surface
  const tangentX: Vector3 = [2 * sampleDistance, heightRight - heightLeft, 0];
  const tangentZ: Vector3 = [0, heightFront - heightBack, 2 * sampleDistance];
  
  // Calculate normal as cross product of tangent vectors
  const normal: Vector3 = [
    tangentX[1] * tangentZ[2] - tangentX[2] * tangentZ[1],  // X component
    tangentX[2] * tangentZ[0] - tangentX[0] * tangentZ[2],  // Y component  
    tangentX[0] * tangentZ[1] - tangentX[1] * tangentZ[0]   // Z component
  ];
  
  // Normalize the vector
  const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
  if (length > 0) {
    normal[0] /= length;
    normal[1] /= length;
    normal[2] /= length;
  }
  
  return normal;
};

/**
 * Convert surface normal to rotation angles
 * This aligns the Y-axis (up vector) of the object with the surface normal
 */
const normalToRotation = (normal: Vector3): Vector3 => {
  const [nx, ny, nz] = normal;
  
  // Ensure the normal is normalized
  const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (length === 0) return [0, 0, 0];
  
  const normalizedX = nx / length;
  const normalizedY = ny / length;
  const normalizedZ = nz / length;
  
  // More robust calculation using atan2 for better precision
  // Calculate rotation angles to align Y-axis with normal
  
  // X rotation (pitch) - rotation around X axis
  // This tilts the object forward/backward based on Z component of normal
  const rotationX = Math.atan2(-normalizedZ, normalizedY);
  
  // Z rotation (roll) - rotation around Z axis  
  // This tilts the object left/right based on X component of normal
  const rotationZ = Math.atan2(normalizedX, normalizedY);
  
  // Y rotation (yaw) - keep it 0 for natural alignment
  const rotationY = 0;
  
  return [rotationX, rotationY, rotationZ];
};

export const placeInstance = (
    instance: SceneObjectInstance,
    options?: {
      landscapeLayer?: SceneLayer;
      placementX?: number;
      placementZ?: number;
      alignToTerrain?: boolean;
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
  let finalRotation = newInstance.transform?.rotation || [0, 0, 0];

  // If landscape layer and placement coordinates are provided, place on landscape
  if (options?.landscapeLayer) {
    targetY = queryHeightAtCoordinate(
        options.landscapeLayer,
        placementX,
        placementZ
    );
    
    // If alignToTerrain is enabled, calculate surface normal and align object
    if (options.alignToTerrain) {
      const surfaceNormal = calculateSurfaceNormal(
        options.landscapeLayer,
        placementX,
        placementZ
      );
      
      const terrainRotation = normalToRotation(surfaceNormal);
      
      // Combine original rotation with terrain alignment
      // Add terrain rotation to existing rotation
      finalRotation = [
        (newInstance.transform?.rotation?.[0] || 0) + terrainRotation[0],
        (newInstance.transform?.rotation?.[1] || 0) + terrainRotation[1],
        (newInstance.transform?.rotation?.[2] || 0) + terrainRotation[2]
      ];
    }
  }

  newInstance.transform = {
    ...newInstance.transform,
    position: [placementX, targetY, placementZ],
    rotation: finalRotation as [number, number, number]
  }
  return newInstance
}

/**
 * Adjusts all object instances in the scene to match perlin noise terrain
 */
export const adjustAllInstancesForPerlinTerrain = (
  instances: SceneObjectInstance[],
  perlinLayer: SceneLayer
): SceneObjectInstance[] => {
  if (!perlinLayer || 
      perlinLayer.type !== 'landscape' || 
      perlinLayer.shape !== 'perlin' || 
      !perlinLayer.noiseData) {
    return instances
  }

  const layerWidth = perlinLayer.width || 1
  const layerHeight = perlinLayer.height || 1
  const halfWidth = layerWidth / 2
  const halfHeight = layerHeight / 2

  return instances.map(instance => {
    if (!instance.transform?.position) {
      return instance
    }

    const [x, currentY, z] = instance.transform.position

    // Check if instance is within terrain bounds
    if (x < -halfWidth || x > halfWidth || z < -halfHeight || z > halfHeight) {
      return instance // Outside terrain bounds, don't adjust
    }

    // Calculate new Y position based on terrain height
    const terrainY = queryHeightAtCoordinate(perlinLayer, x, z)

    return {
      ...instance,
      transform: {
        ...instance.transform,
        position: [x, terrainY, z] as Vector3
      }
    }
  })
}
