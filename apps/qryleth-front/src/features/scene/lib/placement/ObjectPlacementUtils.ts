import type {Vector3} from '@/shared/types/vector3'
import type {BoundingBox} from '@/shared/types/boundingBox'
import type {SceneLayer, SceneObjectInstance} from '@/entities/scene/types'
import { GfxLayerType, GfxLayerShape } from '@/entities/layer'
import { transformBoundingBox } from '@/shared/lib/geometry/boundingBoxUtils'

/**
 * Calculate segments count for perlin terrain - same logic as in perlinGeometry.ts
 */
const calculateSegments = (width: number): number => {
  return width > 200 ? 200 : width
}

export type PlacementStrategy = 'Random' | 'RandomNoCollision' | 'Center' | 'Origin' | 'Custom'

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
  existingInstances?: Array<{
    instance: SceneObjectInstance
    boundingBox: BoundingBox
  }>
  newObjectBoundingBox?: BoundingBox
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

    case 'RandomNoCollision': {
      const position = generateRandomNoCollisionPosition(options)
      return {
        position,
        strategy: 'RandomNoCollision'
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
  if (layer.type !== GfxLayerType.Landscape || layer.shape !== GfxLayerShape.Perlin || !layer.noiseData) {
    return 0; // Default height for non-perlin landscapes
  }

  const width = layer.width || 1;
  const height = layer.height || 1;
  // Use the same segments calculation as in perlinGeometry.ts
  const segments = calculateSegments(width);
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
  if (layer.type !== GfxLayerType.Landscape || layer.shape !== GfxLayerShape.Perlin || !layer.noiseData) {
    return [0, 1, 0]; // Default upward normal
  }

  const width = layer.width || 1;
  const height = layer.height || 1;
  // Use the same segments calculation as in perlinGeometry.ts
  const segments = calculateSegments(width);
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

/**
 * Check if two bounding boxes intersect
 */
const checkBoundingBoxCollision = (box1: BoundingBox, box2: BoundingBox): boolean => {
  return !(
    box1.max[0] < box2.min[0] || // box1 is to the left of box2
    box1.min[0] > box2.max[0] || // box1 is to the right of box2
    box1.max[1] < box2.min[1] || // box1 is below box2
    box1.min[1] > box2.max[1] || // box1 is above box2
    box1.max[2] < box2.min[2] || // box1 is in front of box2
    box1.min[2] > box2.max[2]    // box1 is behind box2
  );
};

/**
 * Generate random position without collisions
 */
const generateRandomNoCollisionPosition = (options: PlacementOptions): Vector3 => {
  const { bounds, landscapeLayer, existingInstances, newObjectBoundingBox } = options;

  if (!existingInstances || !newObjectBoundingBox) {
    console.warn('RandomNoCollision strategy requires existingInstances and newObjectBoundingBox, falling back to Random');
    const x = Math.random() * ((bounds?.maxX ?? 5) - (bounds?.minX ?? -5)) + (bounds?.minX ?? -5);
    const z = Math.random() * ((bounds?.maxZ ?? 5) - (bounds?.minZ ?? -5)) + (bounds?.minZ ?? -5);
    return [x, 0, z];
  }

  const defaultBounds = {
    minX: landscapeLayer ? -(landscapeLayer.width || 10) / 2 : -5,
    maxX: landscapeLayer ? (landscapeLayer.width || 10) / 2 : 5,
    minZ: landscapeLayer ? -(landscapeLayer.height || 10) / 2 : -5,
    maxZ: landscapeLayer ? (landscapeLayer.height || 10) / 2 : 5,
  };

  const finalBounds = { ...defaultBounds, ...bounds };
  const maxAttempts = 100;
  const minDistance = 0.5; // Минимальное расстояние между объектами

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const x = Math.random() * (finalBounds.maxX - finalBounds.minX) + finalBounds.minX;
    const z = Math.random() * (finalBounds.maxZ - finalBounds.minZ) + finalBounds.minZ;

    // Рассчитать правильную Y координату на ландшафте
    let y = 0;
    if (landscapeLayer) {
      y = queryHeightAtCoordinate(landscapeLayer, x, z);
      // Adjust Y position based on object's bounding box to prevent sinking into terrain
      const bottomOffset = newObjectBoundingBox.min[1];
      y = y - bottomOffset;
    }

    // Create transformed bounding box for the new object at this position
    const newObjectTransformedBB = transformBoundingBox(newObjectBoundingBox, {
      position: [x, y, z],
      scale: [1, 1, 1],
      rotation: [0, 0, 0]
    });

    // Добавить padding для минимального расстояния
    const paddedNewBB = {
      min: [
        newObjectTransformedBB.min[0] - minDistance,
        newObjectTransformedBB.min[1] - minDistance,
        newObjectTransformedBB.min[2] - minDistance
      ] as Vector3,
      max: [
        newObjectTransformedBB.max[0] + minDistance,
        newObjectTransformedBB.max[1] + minDistance,
        newObjectTransformedBB.max[2] + minDistance
      ] as Vector3
    };

    // Check collision with all existing instances
    let hasCollision = false;
    for (const existing of existingInstances) {
      const existingPosition = existing.instance.transform?.position || [0, 0, 0];
      const existingScale = existing.instance.transform?.scale || [1, 1, 1];
      const existingRotation = existing.instance.transform?.rotation || [0, 0, 0];

      const existingTransformedBB = transformBoundingBox(existing.boundingBox, {
        position: existingPosition,
        scale: existingScale,
        rotation: existingRotation
      });

      if (checkBoundingBoxCollision(paddedNewBB, existingTransformedBB)) {
        hasCollision = true;
        break;
      }
    }

    if (!hasCollision) {
      return [x, y, z];
    }
  }

  const x = Math.random() * (finalBounds.maxX - finalBounds.minX) + finalBounds.minX;
  const z = Math.random() * (finalBounds.maxZ - finalBounds.minZ) + finalBounds.minZ;
  const y = landscapeLayer ? queryHeightAtCoordinate(landscapeLayer, x, z) - newObjectBoundingBox.min[1] : 0;
  return [x, y, z];
};

export const placeInstance = (
    instance: SceneObjectInstance,
    options?: {
      landscapeLayer?: SceneLayer;
      placementX?: number;
      placementZ?: number;
      alignToTerrain?: boolean;
      objectBoundingBox?: import('@/shared/types').BoundingBox;
      existingInstances?: Array<{
        instance: SceneObjectInstance
        boundingBox: BoundingBox
      }>;
    })=> {
  const newInstance = {...instance};

  let placementX: number | undefined = options?.placementX;
  let placementZ: number | undefined = options?.placementZ;

  let targetY = 0; // Default: place on y=0

  // If no placement coordinates provided, use RandomNoCollision placement
  if (placementX === undefined || placementZ === undefined) {
    const placementResult = generateObjectPlacement({
      strategy: 'RandomNoCollision',
      landscapeLayer: options?.landscapeLayer,
      existingInstances: options?.existingInstances,
      newObjectBoundingBox: options?.objectBoundingBox
    });
    placementX = placementResult.position[0];
    targetY = placementResult.position[1]; // Use Y from strategy
    placementZ = placementResult.position[2];
  } else if (options?.landscapeLayer) {
    // Calculate target Y position manually if coordinates are provided
    targetY = queryHeightAtCoordinate(
        options.landscapeLayer,
        placementX,
        placementZ
    );

    // Adjust Y position based on object's bounding box to prevent sinking into terrain
    if (options?.objectBoundingBox) {
      // Get the object's scale to properly transform the bounding box
      const scale = newInstance.transform?.scale || [1, 1, 1];

      // Calculate the bottom Y offset of the scaled object
      // The object's bottom should touch the terrain surface
      const bottomOffset = options.objectBoundingBox.min[1] * scale[1];

      // Adjust target Y so the object's bottom aligns with terrain
      targetY = targetY - bottomOffset;
    }
  }

  let finalRotation = newInstance.transform?.rotation || [0, 0, 0];

  // If alignToTerrain is enabled, calculate surface normal and align object
  if (options?.alignToTerrain && options?.landscapeLayer) {
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

  newInstance.transform = {
    ...newInstance.transform,
    position: [placementX, targetY, placementZ],
    rotation: finalRotation as [number, number, number]
  }
  return newInstance
}

/**
 * Adjusts all object instances in the scene to match perlin noise terrain
 * Now requires objects array to access bounding boxes for proper placement
 */
export const adjustAllInstancesForPerlinTerrain = (
  instances: SceneObjectInstance[],
  perlinLayer: SceneLayer,
  objects?: Array<{ uuid: string; boundingBox?: import('@/shared/types').BoundingBox }>
): SceneObjectInstance[] => {
  if (!perlinLayer ||
      perlinLayer.type !== GfxLayerType.Landscape ||
      perlinLayer.shape !== GfxLayerShape.Perlin ||
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

    const [originalX, currentY, originalZ] = instance.transform.position

    // Check if instance is within terrain bounds
    if (originalX < -halfWidth || originalX > halfWidth || originalZ < -halfHeight || originalZ > halfHeight) {
      return instance // Outside terrain bounds, don't adjust
    }

    // Calculate new Y position based on terrain height
    let terrainY = queryHeightAtCoordinate(perlinLayer, originalX, originalZ)

    // Adjust Y position based on object's bounding box if available
    if (objects) {
      const object = objects.find(obj => obj.uuid === instance.objectUuid)
      if (object?.boundingBox) {
        const scale = instance.transform?.scale || [1, 1, 1]
        const bottomOffset = object.boundingBox.min[1] * scale[1]
        terrainY = terrainY - bottomOffset
      }
    }

    // Important: preserve original X and Z coordinates exactly
    return {
      ...instance,
      transform: {
        ...instance.transform,
        position: [originalX, terrainY, originalZ] as Vector3
      }
    }
  })
}
