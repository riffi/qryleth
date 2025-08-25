import type {Vector3} from '@/shared/types/vector3'
import type {BoundingBox} from '@/shared/types/boundingBox'
import type {SceneLayer, SceneObjectInstance} from '@/entities/scene/types'
import { GfxLayerType, GfxLayerShape } from '@/entities/layer'
import type { GfxTerrainConfig } from '@/entities/terrain'
import { createGfxHeightSampler } from '@/features/scene/lib/terrain/GfxHeightSampler'
import { transformBoundingBox } from '@/shared/lib/geometry/boundingBoxUtils'
import { generateUUID } from '@/shared/lib/uuid'

/**
 * Создать terrain конфигурацию из legacy данных слоя для обратной совместимости
 * @param layer - слой сцены с legacy данными
 * @returns конфигурация террейна для GfxHeightSampler или null если не применимо
 */
const createLegacyTerrainConfig = (layer: SceneLayer): GfxTerrainConfig | null => {
  if (layer.type === GfxLayerType.Landscape && layer.shape === GfxLayerShape.Terrain && layer.noiseData) {
    return {
      worldWidth: layer.width || 1,
      worldHeight: layer.height || 1,
      edgeFade: 0.15,
      source: {
        kind: 'legacy',
        data: new Float32Array(layer.noiseData),
        width: layer.width && layer.width > 200 ? 200 : layer.width || 1,
        height: layer.height && layer.height > 200 ? 200 : layer.height || 1
      }
    }
  }
  return null
}

/**
 * Получить GfxHeightSampler для работы с высотами террейна слоя
 * @param layer - слой сцены, который может содержать terrain данные
 * @returns сэмплер высот или null если слой не подходящий
 */
const getHeightSamplerForLayer = (layer: SceneLayer) => {
  if (layer.type !== GfxLayerType.Landscape) {
    return null
  }
  
  // Приоритет: новая архитектура (terrain) > legacy (noiseData)
  if (layer.terrain) {
    return createGfxHeightSampler(layer.terrain)
  }
  
  const legacyConfig = createLegacyTerrainConfig(layer)
  if (legacyConfig) {
    return createGfxHeightSampler(legacyConfig)
  }
  
  return null
}

/**
 * Стратегии размещения объектов в сцене
 */
export enum PlacementStrategy {
  Random = 'Random',
  RandomNoCollision = 'RandomNoCollision'
}

/**
 * Метаданные для стратегии Random размещения
 */
export interface RandomMetadata {
  // Пустая структура - будет расширена позже при необходимости
}

/**
 * Метаданные для стратегии RandomNoCollision размещения
 */
export interface RandomNoCollisionMetadata {
  // Пустая структура - будет расширена позже при необходимости
}

/**
 * Дискриминированное объединение для строгой связи стратегии с метаданными
 */
export type PlacementStrategyConfig = 
  | { strategy: PlacementStrategy.Random; metadata?: RandomMetadata }
  | { strategy: PlacementStrategy.RandomNoCollision; metadata?: RandomNoCollisionMetadata }

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
 * Generate object placement position based on strategy (legacy version)
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
    case PlacementStrategy.Random: {
      const x = Math.random() * (finalBounds.maxX - finalBounds.minX) + finalBounds.minX
      const z = Math.random() * (finalBounds.maxZ - finalBounds.minZ) + finalBounds.minZ
      return {
        position: [x, 0, z], // Y will be adjusted by correctLLMGeneratedObject
        strategy: PlacementStrategy.Random
      }
    }

    case PlacementStrategy.RandomNoCollision: {
      const position = generateRandomNoCollisionPosition(options)
      return {
        position,
        strategy: PlacementStrategy.RandomNoCollision
      }
    }

    default: {
      console.warn(`Unknown placement strategy: ${strategy}, falling back to Random`)
      const x = Math.random() * (finalBounds.maxX - finalBounds.minX) + finalBounds.minX
      const z = Math.random() * (finalBounds.maxZ - finalBounds.minZ) + finalBounds.minZ
      return {
        position: [x, 0, z],
        strategy: PlacementStrategy.Random
      }
    }
  }
}

/**
 * Новая версия генерации размещения с использованием дискриминированного объединения
 */
export const generateObjectPlacementWithConfig = (
  placementStrategyConfig: PlacementStrategyConfig,
  options: {
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
): PlacementResult => {
  // Создаем старый формат options для использования с legacy функцией
  const legacyOptions: PlacementOptions = {
    strategy: placementStrategyConfig.strategy,
    bounds: options.bounds,
    landscapeLayer: options.landscapeLayer,
    existingInstances: options.existingInstances,
    newObjectBoundingBox: options.newObjectBoundingBox
  };

  // Вызываем старую функцию генерации размещения
  return generateObjectPlacement(legacyOptions);
}

/**
 * Get random placement within landscape bounds
 */
export const getRandomPlacement = (landscapeLayer?: SceneLayer): PlacementResult => {
  return generateObjectPlacement({
    strategy: PlacementStrategy.Random,
    landscapeLayer
  })
}

/**
 * Получить высоту в заданной точке мировых координат для данного слоя.
 * Использует унифицированный GfxHeightSampler для всех типов источников террейна.
 * @param layer - слой сцены (должен быть landscape типа)
 * @param worldX - координата X в мировой системе координат
 * @param worldZ - координата Z в мировой системе координат
 * @returns высота Y в мировых единицах (0 для не-terrain слоев)
 */
const queryHeightAtCoordinate = (
    layer: SceneLayer,
    worldX: number,
    worldZ: number
): number => {
  const sampler = getHeightSamplerForLayer(layer)
  if (!sampler) {
    return 0 // Default height for non-terrain layers
  }
  
  return sampler.getHeight(worldX, worldZ)
};

/**
 * Вычислить поверхностную нормаль в заданной точке мировых координат для данного слоя.
 * Использует унифицированный GfxHeightSampler для всех типов источников террейна.
 * @param layer - слой сцены (должен быть landscape типа)
 * @param worldX - координата X в мировой системе координат
 * @param worldZ - координата Z в мировой системе координат
 * @returns вектор нормали [x, y, z] ([0, 1, 0] для не-terrain слоев)
 */
const calculateSurfaceNormal = (
    layer: SceneLayer,
    worldX: number,
    worldZ: number
): Vector3 => {
  const sampler = getHeightSamplerForLayer(layer)
  if (!sampler) {
    return [0, 1, 0] // Default upward normal for non-terrain layers
  }
  
  return sampler.getNormal(worldX, worldZ)
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

/**
 * Временная функция для обратной совместимости во время миграции.
 * Использует старую сигнатуру и логику placeInstance.
 * @deprecated Будет удалена после завершения миграции всех вызовов на новый placeInstance
 */
export const placeInstanceLegacy = (
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
      strategy: PlacementStrategy.RandomNoCollision,
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
 * Размещение объекта в сцене с новой сигнатурой.
 * Функция принимает UUID объекта и создает множественные инстансы внутри.
 * @param objectUuid - UUID объекта для создания инстансов
 * @param options - опции размещения
 * @param count - количество инстансов для создания
 * @param placementStrategyConfig - конфигурация стратегии размещения
 * @returns массив созданных инстансов объектов
 */
export const placeInstance = (
    objectUuid: string,
    options: {
      landscapeLayer?: SceneLayer;
      alignToTerrain?: boolean;
      objectBoundingBox?: import('@/shared/types').BoundingBox;
      existingInstances?: Array<{instance: SceneObjectInstance, boundingBox: BoundingBox}>;
    },
    count: number,
    placementStrategyConfig: PlacementStrategyConfig
): SceneObjectInstance[] => {
  const createdInstances: SceneObjectInstance[] = [];
  
  for (let i = 0; i < count; i++) {
    // Создать новый экземпляр
    const newInstance: SceneObjectInstance = {
      uuid: generateUUID(),
      objectUuid: objectUuid,
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1]
      },
      visible: true
    };

    // Генерировать позицию с помощью новой generateObjectPlacementWithConfig
    const placementResult = generateObjectPlacementWithConfig(placementStrategyConfig, {
      landscapeLayer: options.landscapeLayer,
      existingInstances: [...(options.existingInstances || []), ...createdInstances.map(inst => ({
        instance: inst,
        boundingBox: options.objectBoundingBox || { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] }
      }))],
      newObjectBoundingBox: options.objectBoundingBox
    });
    let targetY = placementResult.position[1];
    let finalRotation = newInstance.transform?.rotation || [0, 0, 0];
    
    // Если нужно выровнять по террейну
    if (options.alignToTerrain && options.landscapeLayer) {
      const surfaceNormal = calculateSurfaceNormal(
        options.landscapeLayer,
        placementResult.position[0],
        placementResult.position[2]
      );

      const terrainRotation = normalToRotation(surfaceNormal);
      finalRotation = [
        (newInstance.transform?.rotation?.[0] || 0) + terrainRotation[0],
        (newInstance.transform?.rotation?.[1] || 0) + terrainRotation[1],
        (newInstance.transform?.rotation?.[2] || 0) + terrainRotation[2]
      ];
    }

    // Установить финальную позицию и поворот
    newInstance.transform = {
      ...newInstance.transform,
      position: [placementResult.position[0], targetY, placementResult.position[2]],
      rotation: finalRotation as [number, number, number]
    };
    
    createdInstances.push(newInstance);
  }
  
  return createdInstances;
}

/**
 * @deprecated Старая функция placeInstance. Используйте placeInstanceLegacy для временной совместимости.
 */
const oldPlaceInstance = (
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
      strategy: PlacementStrategy.RandomNoCollision,
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
 * Асинхронная версия функции размещения экземпляра объекта.
 * Ожидает полной загрузки данных heightmap для правильного позиционирования.
 */
export const placeInstanceAsync = async (
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
    }): Promise<SceneObjectInstance> => {
  const newInstance = {...instance};

  // Для heightmap слоев ожидаем загрузки данных
  if (options?.landscapeLayer?.terrain?.source.kind === 'heightmap') {
    const sampler = getHeightSamplerForLayer(options.landscapeLayer)
    if (sampler) {
      await new Promise<void>((resolve) => {
        // Проверяем, готовы ли данные сразу
        const testHeight = sampler.getHeight(0, 0)
        if (testHeight !== 0 || 
            (options.landscapeLayer?.terrain?.source.kind === 'heightmap' && 
             options.landscapeLayer.terrain.source.params.min === 0 && 
             options.landscapeLayer.terrain.source.params.max === 0)) {
          // Данные готовы
          resolve()
          return
        }

        // Ожидаем загрузки данных
        sampler.onHeightmapLoaded(() => {
          resolve()
        })
      })
    }
  }

  // Используем legacy версию после ожидания
  return placeInstanceLegacy(instance, options)
}

/**
 * Подогнать все экземпляры объектов к высоте террейна.
 * Поддерживает все типы террейнов через унифицированный GfxHeightSampler.
 * @param instances - массив экземпляров объектов для корректировки
 * @param terrainLayer - слой террейна (может быть любого типа terrain)
 * @param objects - массив объектов с bounding box для правильного позиционирования
 * @returns скорректированный массив экземпляров объектов
 */
export const adjustAllInstancesForPerlinTerrain = (
  instances: SceneObjectInstance[],
  terrainLayer: SceneLayer,
  objects?: Array<{ uuid: string; boundingBox?: import('@/shared/types').BoundingBox }>
): SceneObjectInstance[] => {
  const sampler = getHeightSamplerForLayer(terrainLayer)
  if (!sampler) {
    return instances // No valid terrain layer, return unchanged
  }

  const layerWidth = terrainLayer.width || 1
  const layerHeight = terrainLayer.height || 1
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

    // Calculate new Y position based on terrain height using unified sampler
    let terrainY = sampler.getHeight(originalX, originalZ)

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

/**
 * Асинхронная версия функции подгонки экземпляров объектов к высоте террейна.
 * Ожидает полной загрузки данных heightmap перед выравниванием инстансов.
 * @param instances - массив экземпляров объектов для корректировки
 * @param terrainLayer - слой террейна (может быть любого типа terrain)
 * @param objects - массив объектов с bounding box для правильного позиционирования
 * @returns Promise с скорректированным массивом экземпляров объектов
 */
export const adjustAllInstancesForTerrainAsync = async (
  instances: SceneObjectInstance[],
  terrainLayer: SceneLayer,
  objects?: Array<{ uuid: string; boundingBox?: import('@/shared/types').BoundingBox }>
): Promise<SceneObjectInstance[]> => {
  const sampler = getHeightSamplerForLayer(terrainLayer)
  if (!sampler) {
    return instances // No valid terrain layer, return unchanged
  }

  // Для heightmap источников ожидаем загрузки данных
  if (terrainLayer.terrain?.source.kind === 'heightmap') {
    await new Promise<void>((resolve) => {
      // Проверяем, готовы ли данные сразу
      const testHeight = sampler.getHeight(0, 0)
      if (testHeight !== 0 || 
          (terrainLayer.terrain?.source.kind === 'heightmap' && 
           terrainLayer.terrain.source.params.min === 0 && 
           terrainLayer.terrain.source.params.max === 0)) {
        // Данные готовы
        resolve()
        return
      }

      // Ожидаем загрузки данных
      sampler.onHeightmapLoaded(() => {
        resolve()
      })
    })
  }

  const layerWidth = terrainLayer.width || 1
  const layerHeight = terrainLayer.height || 1
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

    // Calculate new Y position based on terrain height using unified sampler
    let terrainY = sampler.getHeight(originalX, originalZ)

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
