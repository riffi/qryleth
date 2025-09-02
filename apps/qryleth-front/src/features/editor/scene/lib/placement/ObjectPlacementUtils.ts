import type {Vector3} from '@/shared/types/vector3'
import type {BoundingBox} from '@/shared/types/boundingBox'
import type {SceneLayer, SceneObjectInstance} from '@/entities/scene/types'
import { GfxLayerType, GfxLayerShape } from '@/entities/layer'
import { createGfxHeightSampler } from '@/features/editor/scene/lib/terrain/GfxHeightSampler'
import { transformBoundingBox, getBoundingBoxCenter } from '@/shared/lib/geometry/boundingBoxUtils'
import { generateUUID } from '@/shared/lib/uuid'
import { normalize as v3normalize, length as v3length } from '@/shared/lib/math/vector3'

/**
 * Получить GfxHeightSampler для работы с высотами террейна слоя
 * @param layer - слой сцены, который может содержать terrain данные
 * @returns сэмплер высот или null если слой не подходящий
 */
const getHeightSamplerForLayer = (layer: SceneLayer) => {
  if (layer.type !== GfxLayerType.Landscape) {
    return null
  }

  // Используем только новую архитектуру (terrain). Legacy удалён.
  if (layer.terrain) {
    return createGfxHeightSampler(layer.terrain)
  }

  return null
}

/**
 * Стратегии размещения объектов в сцене
 */
export enum PlacementStrategy {
  Random = 'Random',
  RandomNoCollision = 'RandomNoCollision',
  PlaceAround = 'PlaceAround'
}

/**
 * Максимальный наклон (в градусах), к которому линеарно масштабируется
 * реальный наклон нормали. То есть:
 *  - угол нормали 0°  → поворот 0°,
 *  - угол нормали 90° → поворот MAX_TERRAIN_TILT_DEG.
 * Это сохраняет разнообразие наклонов и исключает эффект «упора в максимум».
 */
const MAX_TERRAIN_TILT_DEG = 30;
const MAX_TERRAIN_TILT_RAD = (Math.PI / 180) * MAX_TERRAIN_TILT_DEG;

/**
 * Пересчитывает наклон нормали относительно вертикали (оси Y) в пропорции, чтобы
 * 90° соответствовало maxTiltRad, а 0° — 0. Сохраняет направление наклона (по XZ)
 * и «полушарие» (знак Y) исходной нормали.
 */
const limitNormalByMaxTilt = (normal: Vector3, maxTiltRad: number): Vector3 => {
  const len0 = v3length(normal)
  if (len0 <= 1e-8) return [0, 1, 0]
  const [nx, ny, nz] = v3normalize(normal)

  // Угол до оси Y (0..90°), независимо от полушария
  const angle = Math.acos(Math.max(-1, Math.min(1, Math.abs(ny))))

  // Сохраняем исходное полушарие (вверх/вниз), чтобы не менять знаки поворотов
  const signY = ny >= 0 ? 1 : -1

  // Направление наклона — проекция на XZ
  const hx0 = nx
  const hz0 = nz
  const hlen = Math.hypot(hx0, hz0)
  let hx = 0, hz = 1 // дефолт: вдоль +Z, если горизонтальная компонента слишком мала
  if (hlen > 1e-8) {
    hx = hx0 / hlen
    hz = hz0 / hlen
  }

  // Линеарное масштабирование угла: 0..90° -> 0..maxTiltRad
  const k = maxTiltRad / (Math.PI / 2) // коэффициент масштабирования
  const mapped = angle * k

  const y = signY * Math.cos(mapped)
  const s = Math.sin(mapped)
  const x = hx * s
  const z = hz * s
  return [x, y, z]
}

/**
 * Метаданные для стратегии Random размещения
 */
export interface RandomMetadata {
  /** Максимальный наклон (в градусах) для автоповорота по нормали; если не задан — используется константа. */
  maxTerrainTiltDeg?: number
}

/**
 * Метаданные для стратегии RandomNoCollision размещения
 */
export interface RandomNoCollisionMetadata {
  /** Максимальный наклон (в градусах) для автоповорота по нормали; если не задан — используется константа. */
  maxTerrainTiltDeg?: number
}

/**
 * Метаданные для стратегии PlaceAround размещения
 * Размещение объектов вокруг целевых инстансов с настраиваемыми параметрами
 */
export interface PlaceAroundMetadata {
  // === ЦЕЛЕВЫЕ ОБЪЕКТЫ (взаимоисключающие параметры) ===
  /** UUID конкретного инстанса (приоритет 1) */
  targetInstanceUuid?: string
  /** UUID объекта, вокруг всех инстансов которого размещать (приоритет 2) */
  targetObjectUuid?: string

  // === РАССТОЯНИЯ (обязательные параметры) ===
  /** минимальное расстояние от грани target до грани нового объекта (единицы мира) */
  minDistance: number
  /** максимальное расстояние от грани target до грани нового объекта (единицы мира) */
  maxDistance: number

  // === ПАРАМЕТРЫ РАСПРЕДЕЛЕНИЯ (опциональные) ===
  /** начальный угол в радианах (по умолчанию: 0) */
  angleOffset?: number
  /** равномерно по кругу или случайно (по умолчанию: true) */
  distributeEvenly?: boolean
  /** только горизонтально Y=const или 3D (по умолчанию: true) */
  onlyHorizontal?: boolean
  /** Максимальный наклон (в градусах) для автоповорота по нормали; если не задан — используется константа. */
  maxTerrainTiltDeg?: number
}

/**
 * Дискриминированное объединение для строгой связи стратегии с метаданными
 */
export type PlacementStrategyConfig =
  | { strategy: PlacementStrategy.Random; metadata?: RandomMetadata }
  | { strategy: PlacementStrategy.RandomNoCollision; metadata?: RandomNoCollisionMetadata }
  | { strategy: PlacementStrategy.PlaceAround; metadata: PlaceAroundMetadata }

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

  // Determine bounds from landscape layer if available (terrain-aware)
  const worldW = landscapeLayer
    ? (landscapeLayer.terrain?.worldWidth ?? landscapeLayer.width ?? 10)
    : 10
  const worldH = landscapeLayer
    ? (landscapeLayer.terrain?.worldHeight ?? landscapeLayer.depth ?? 10)
    : 10
  const centerX = landscapeLayer?.terrain?.center?.[0] ?? 0
  const centerZ = landscapeLayer?.terrain?.center?.[1] ?? 0
  const defaultBounds = {
    minX: centerX - (worldW) / 2,
    maxX: centerX + (worldW) / 2,
    minZ: centerZ - (worldH) / 2,
    maxZ: centerZ + (worldH) / 2,
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

    case PlacementStrategy.PlaceAround: {
      // PlaceAround стратегия требует специфических параметров в новом формате
      // Для старой сигнатуры этот случай будет обработан только через generateObjectPlacementWithConfig
      console.warn('PlaceAround strategy requires PlacementStrategyConfig with metadata. Use generateObjectPlacementWithConfig instead.')

      // Fallback на Random для backward compatibility
      const x = Math.random() * (finalBounds.maxX - finalBounds.minX) + finalBounds.minX
      const z = Math.random() * (finalBounds.maxZ - finalBounds.minZ) + finalBounds.minZ
      return {
        position: [x, 0, z],
        strategy: PlacementStrategy.Random
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
 * Поддерживает дополнительные параметры instanceIndex и totalInstancesCount для PlaceAround
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
    instanceIndex?: number // для PlaceAround стратегии
    totalInstancesCount?: number // для PlaceAround стратегии
  }
): PlacementResult => {
  // Для PlaceAround используем специальную логику
  if (placementStrategyConfig.strategy === PlacementStrategy.PlaceAround) {
    if (!options.existingInstances || !options.newObjectBoundingBox) {
      throw new Error('PlaceAround strategy requires existingInstances and newObjectBoundingBox')
    }

    const instanceIndex = options.instanceIndex ?? 0
    const totalInstancesCount = options.totalInstancesCount ?? 1

    const position = generatePlaceAroundPosition(
      placementStrategyConfig.metadata,
      options.existingInstances,
      options.newObjectBoundingBox,
      instanceIndex,
      totalInstancesCount
    )

    return {
      position,
      strategy: PlacementStrategy.PlaceAround
    }
  }

  // Для остальных стратегий используем старую функцию
  const legacyOptions: PlacementOptions = {
    strategy: placementStrategyConfig.strategy,
    bounds: options.bounds,
    landscapeLayer: options.landscapeLayer,
    existingInstances: options.existingInstances,
    newObjectBoundingBox: options.newObjectBoundingBox
  };

  return generateObjectPlacement(legacyOptions);
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
 * Преобразует нормаль поверхности в углы Эйлера [rx, ry, rz] (в радианах),
 * выравнивая ось Y объекта по нормали. Азимут (ry) фиксируем равным 0 —
 * управляем только наклонами вокруг X и Z.
 *
 * Принято соглашение: последовательность поворотов Rz(rz) затем Rx(rx),
 * действующая на мировой вектор up (0,1,0). Решение даёт простые формулы:
 *   rx = atan2(nz, ny)
 *   rz = atan2(nx, ny)
 * где n = normalize(normal). Такие знаки согласуются с ожидаемой интуицией:
 *   - положительное nz => положительный наклон вперёд (rx > 0)
 *   - положительное nx => наклон вправо (rz > 0)
 */
const normalToRotation = (normal: Vector3, maxTiltRad?: number): Vector3 => {
  // Ограничиваем нормаль согласно maxTiltRad (либо глобальной константе)
  const [x, y, z] = limitNormalByMaxTilt(normal, maxTiltRad ?? MAX_TERRAIN_TILT_RAD)
  const rx = Math.atan2(z, y)
  const rz = Math.atan2(x, y)
  const ry = 0
  return [rx, ry, rz]
};

/**
 * Генерировать позицию вокруг target объектов для стратегии PlaceAround
 * Включает проверку коллизий со всеми существующими объектами (максимум 100 попыток)
 * @param metadata - метаданные PlaceAround с параметрами размещения
 * @param existingInstances - существующие инстансы для поиска target объектов
 * @param newObjectBoundingBox - bounding box создаваемого объекта
 * @param instanceIndex - индекс текущего инстанса (для равномерного распределения)
 * @param totalInstancesCount - общее количество создаваемых инстансов
 * @returns позицию Vector3 для размещения нового объекта
 */
const generatePlaceAroundPosition = (
  metadata: PlaceAroundMetadata,
  existingInstances: Array<{ instance: SceneObjectInstance; boundingBox: BoundingBox }>,
  newObjectBoundingBox: BoundingBox,
  instanceIndex: number,
  totalInstancesCount: number
): Vector3 => {
  // Валидация метаданных
  validatePlaceAroundMetadata(metadata)

  // 1. Поиск целевых инстансов по приоритету
  let targetInstances: Array<{ instance: SceneObjectInstance; boundingBox: BoundingBox }> = []

  if (metadata.targetInstanceUuid) {
    // Приоритет 1: конкретный инстанс
    const targetInstance = existingInstances.find(
      ({ instance }) => instance.uuid === metadata.targetInstanceUuid
    )
    if (!targetInstance) {
      throw new Error(`Target instance with UUID ${metadata.targetInstanceUuid} not found`)
    }
    targetInstances = [targetInstance]
  } else if (metadata.targetObjectUuid) {
    // Приоритет 2: все инстансы объекта
    targetInstances = existingInstances.filter(
      ({ instance }) => instance.objectUuid === metadata.targetObjectUuid
    )
    if (targetInstances.length === 0) {
      throw new Error(`No instances found for target object UUID ${metadata.targetObjectUuid}`)
    }
  }

  // 2. Выбор конкретного target инстанса для текущего создаваемого объекта
  // Распределяем новые объекты равномерно между всеми target инстансами
  const targetIndex = instanceIndex % targetInstances.length
  const targetInstanceData = targetInstances[targetIndex]
  const targetInstance = targetInstanceData.instance
  const targetBoundingBox = targetInstanceData.boundingBox

  // 3. Получение позиции и transform target инстанса
  // Пояснение: для корректного окружения вокруг геометрического центра объекта
  // далее будем использовать центр преобразованного bounding box (а не pivot-позицию).
  const targetPosition = targetInstance.transform?.position || [0, 0, 0]
  const targetScale = targetInstance.transform?.scale || [1, 1, 1]
  const targetRotation = targetInstance.transform?.rotation || [0, 0, 0]

  // 4. Расчет transformed bounding box для target инстанса
  const targetTransformedBB = transformBoundingBox(targetBoundingBox, {
    position: targetPosition,
    scale: targetScale,
    rotation: targetRotation
  })

  // 5. Расчет центра и радиуса target объекта
  // Центр: берём центр трансформированного bounding box, чтобы круг размещения
  // проходил вокруг геометрического центра, а не вокруг pivot, что исключает сдвиг.
  const targetCenter: Vector3 = getBoundingBoxCenter(targetTransformedBB)

  // Радиус: используем максимальный размер по X/Z как консервативную оценку до грани
  const targetRadius = Math.max(
    targetTransformedBB.max[0] - targetTransformedBB.min[0],
    targetTransformedBB.max[2] - targetTransformedBB.min[2]
  ) / 2

  // 6. Расчет радиуса нового объекта
  const newObjectRadius = Math.max(
    newObjectBoundingBox.max[0] - newObjectBoundingBox.min[0],
    newObjectBoundingBox.max[2] - newObjectBoundingBox.min[2]
  ) / 2

  // 7. Настройки для поиска позиции без коллизий
  const maxAttempts = 100
  const minDistance = 0.5 // Минимальное расстояние между объектами для избежания коллизий
  const onlyHorizontal = metadata.onlyHorizontal !== false // по умолчанию true
  const distributeEvenly = metadata.distributeEvenly !== false // по умолчанию true

  // 8. Поиск позиции без коллизий (максимум 100 попыток)
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Расчет случайного расстояния от грани до грани
    const edgeToEdgeDistance = Math.random() * (metadata.maxDistance - metadata.minDistance) + metadata.minDistance
    const actualCenterDistance = edgeToEdgeDistance + targetRadius + newObjectRadius

    // Расчет угла размещения
    let angle: number
    if (distributeEvenly) {
      // Равномерное распределение по кругу с небольшой случайностью на каждой попытке
      const angleStep = (2 * Math.PI) / totalInstancesCount
      const baseAngle = (metadata.angleOffset || 0) + instanceIndex * angleStep
      // Добавляем случайное отклонение ±10% от равномерного угла при повторных попытках
      const angleVariation = attempt > 0 ? (Math.random() - 0.5) * 0.2 * angleStep : 0
      angle = baseAngle + angleVariation
    } else {
      // Случайное распределение углов
      angle = (metadata.angleOffset || 0) + Math.random() * 2 * Math.PI
    }

    // Расчет новой позиции относительно target центра
    // Используем targetCenter по X/Z, чтобы исключить сдвиг кольца относительно объекта
    const newX = targetCenter[0] + actualCenterDistance * Math.cos(angle)
    const newZ = targetCenter[2] + actualCenterDistance * Math.sin(angle)

    // Расчет позиции по высоте Y
    let newY: number
    if (onlyHorizontal) {
      // Горизонтальное размещение — та же высота, что у геометрического центра target
      // (соответствует спецификации: targetCenter[1])
      newY = targetCenter[1]
    } else {
      // 3D размещение - случайная высота в пределах actualCenterDistance * 0.5
      const verticalRange = actualCenterDistance * 0.5
      const verticalOffset = (Math.random() - 0.5) * 2 * verticalRange
      newY = targetPosition[1] + verticalOffset
    }

    // 9. Создание transformed bounding box для нового объекта в кандидатской позиции
    const candidateTransformedBB = transformBoundingBox(newObjectBoundingBox, {
      position: [newX, newY, newZ],
      scale: [1, 1, 1],
      rotation: [0, 0, 0]
    })

    // 10. Добавление padding для минимального расстояния
    const paddedCandidateBB = {
      min: [
        candidateTransformedBB.min[0] - minDistance,
        candidateTransformedBB.min[1] - minDistance,
        candidateTransformedBB.min[2] - minDistance
      ] as Vector3,
      max: [
        candidateTransformedBB.max[0] + minDistance,
        candidateTransformedBB.max[1] + minDistance,
        candidateTransformedBB.max[2] + minDistance
      ] as Vector3
    }

    // 11. Проверка коллизий со всеми существующими инстансами
    let hasCollision = false
    for (const existing of existingInstances) {
      const existingPosition = existing.instance.transform?.position || [0, 0, 0]
      const existingScale = existing.instance.transform?.scale || [1, 1, 1]
      const existingRotation = existing.instance.transform?.rotation || [0, 0, 0]

      const existingTransformedBB = transformBoundingBox(existing.boundingBox, {
        position: existingPosition,
        scale: existingScale,
        rotation: existingRotation
      })

      if (checkBoundingBoxCollision(paddedCandidateBB, existingTransformedBB)) {
        hasCollision = true
        break
      }
    }

    // 12. Если коллизий нет - возвращаем найденную позицию
    if (!hasCollision) {
      return [newX, newY, newZ]
    }
  }

  // 13. Если не удалось найти позицию без коллизий за maxAttempts попыток
  // Возвращаем позицию с предупреждением (fallback механизм)
  console.warn(`PlaceAround: Could not find collision-free position after ${maxAttempts} attempts, placing with potential collision`)

  // Fallback: используем базовые параметры для размещения
  const fallbackEdgeDistance = (metadata.minDistance + metadata.maxDistance) / 2
  const fallbackCenterDistance = fallbackEdgeDistance + targetRadius + newObjectRadius
  const fallbackAngle = distributeEvenly
    ? (metadata.angleOffset || 0) + instanceIndex * (2 * Math.PI) / totalInstancesCount
    : (metadata.angleOffset || 0) + Math.random() * 2 * Math.PI

  const fallbackX = targetPosition[0] + fallbackCenterDistance * Math.cos(fallbackAngle)
  const fallbackZ = targetPosition[2] + fallbackCenterDistance * Math.sin(fallbackAngle)
  const fallbackY = onlyHorizontal
    ? targetPosition[1]
    : targetPosition[1] + (Math.random() - 0.5) * fallbackCenterDistance

  return [fallbackX, fallbackY, fallbackZ]
}

/**
 * Валидировать параметры PlaceAround метаданных
 * @param metadata - метаданные PlaceAround для валидации
 * @throws Error если параметры невалидны
 */
const validatePlaceAroundMetadata = (metadata: PlaceAroundMetadata): void => {
  // Проверка обязательности одного из target параметров
  if (!metadata.targetInstanceUuid && !metadata.targetObjectUuid) {
    throw new Error('PlaceAround strategy requires either targetInstanceUuid or targetObjectUuid')
  }

  // Проверка корректности расстояний
  if (metadata.minDistance < 0) {
    throw new Error('PlaceAround minDistance must be >= 0')
  }

  if (metadata.maxDistance <= metadata.minDistance) {
    throw new Error('PlaceAround maxDistance must be > minDistance')
  }
}

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

  const worldW = landscapeLayer
    ? (landscapeLayer.terrain?.worldWidth ?? landscapeLayer.width ?? 10)
    : 10
  const worldH = landscapeLayer
    ? (landscapeLayer.terrain?.worldHeight ?? landscapeLayer.height ?? 10)
    : 10
  const centerX = landscapeLayer?.terrain?.center?.[0] ?? 0
  const centerZ = landscapeLayer?.terrain?.center?.[1] ?? 0
  const defaultBounds = {
    minX: centerX - (worldW) / 2,
    maxX: centerX + (worldW) / 2,
    minZ: centerZ - (worldH) / 2,
    maxZ: centerZ + (worldH) / 2,
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
/**
 * Размещение одного экземпляра объекта (устаревший метод, сохраняется для обратной совместимости).
 *
 * Разделение флага выравнивания по террейну:
 * - alignToTerrainHeight: выравнивать по высоте ландшафта (Y). Если задан bounding box, нижняя грань ставится на поверхность.
 * - alignToTerrainRotation: автоповорот по нормали поверхности в точке (X,Z). По умолчанию выключен на уровне вызывающих методов.
 *
 * Ранее использовался единый флаг alignToTerrain, который совмещал оба аспекта. Теперь флаги разделены.
 */
export const placeInstanceLegacy = (
    instance: SceneObjectInstance,
    options?: {
      landscapeLayer?: SceneLayer;
      placementX?: number;
      placementZ?: number;
      alignToTerrainHeight?: boolean;
      alignToTerrainRotation?: boolean;
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

  // Применяем выравнивание по высоте, если включено и есть слой ландшафта
  if (options?.alignToTerrainHeight && options?.landscapeLayer) {
    // targetY уже рассчитан выше: при наличии bounding box учитывается нижняя грань
  }

  let finalRotation = newInstance.transform?.rotation || [0, 0, 0];

  // Автоповорот по нормали поверхности
  if (options?.alignToTerrainRotation && options?.landscapeLayer) {
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
/**
 * Размещение объекта(ов) по новой сигнатуре через стратегии размещения.
 *
 * Параметры выравнивания разделены:
 * - alignToTerrainHeight: выравнивать по высоте ландшафта (Y). Если задан bounding box, нижняя грань ставится на поверхность.
 * - alignToTerrainRotation: автоповорот по нормали поверхности (X,Z) — выключен по умолчанию в вызывающем коде.
 */
export const placeInstance = (
    objectUuid: string,
    options: {
      landscapeLayer?: SceneLayer;
      alignToTerrainHeight?: boolean;
      alignToTerrainRotation?: boolean;
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
      newObjectBoundingBox: options.objectBoundingBox,
      instanceIndex: i, // передаем индекс текущего инстанса для PlaceAround
      totalInstancesCount: count // передаем общее количество инстансов для PlaceAround
    });
    // Корректируем высоту Y: если стратегия не задала Y, а требуется выравнивание по высоте террейна,
    // вычисляем высоту ландшафта и поднимаем объект так, чтобы нижняя грань касалась поверхности.
    let targetY = placementResult.position[1];
    if (options.alignToTerrainHeight && options.landscapeLayer) {
      const heightY = queryHeightAtCoordinate(
        options.landscapeLayer,
        placementResult.position[0],
        placementResult.position[2]
      );
      if (options.objectBoundingBox) {
        const scale = newInstance.transform?.scale || [1, 1, 1];
        const bottomOffset = options.objectBoundingBox.min[1] * scale[1];
        targetY = heightY - bottomOffset;
      } else {
        targetY = heightY;
      }
    }
    let finalRotation = newInstance.transform?.rotation || [0, 0, 0];

    // Если нужно выполнить автоповорот по нормали поверхности
    if (options.alignToTerrainRotation && options.landscapeLayer) {
      // Определяем максимальный наклон из метаданных стратегии, если задан
      let maxTiltDeg: number | undefined
      if (placementStrategyConfig.strategy === PlacementStrategy.PlaceAround) {
        maxTiltDeg = placementStrategyConfig.metadata?.maxTerrainTiltDeg
      } else if (placementStrategyConfig.strategy === PlacementStrategy.Random) {
        maxTiltDeg = placementStrategyConfig.metadata?.maxTerrainTiltDeg
      } else if (placementStrategyConfig.strategy === PlacementStrategy.RandomNoCollision) {
        maxTiltDeg = placementStrategyConfig.metadata?.maxTerrainTiltDeg
      }
      const maxTiltRad = typeof maxTiltDeg === 'number' ? (Math.PI / 180) * maxTiltDeg : undefined

      const surfaceNormal = calculateSurfaceNormal(
        options.landscapeLayer,
        placementResult.position[0],
        placementResult.position[2]
      );

      const terrainRotation = normalToRotation(surfaceNormal, maxTiltRad);
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

  // Для Landscape слоя термин «глубина» хранится в поле depth.
  // Приоритет: берём реальные размеры из конфигурации террейна, затем поля слоя (width/depth|height).
  const layerWidth = terrainLayer.terrain?.worldWidth ?? terrainLayer.width ?? 1
  const layerDepth = terrainLayer.terrain?.worldHeight ?? (terrainLayer as any).depth ?? terrainLayer.height ?? 1
  const halfWidth = layerWidth / 2
  const halfDepth = layerDepth / 2

  return instances.map(instance => {
    if (!instance.transform?.position) {
      return instance
    }

    const [originalX, currentY, originalZ] = instance.transform.position

    // Check if instance is within terrain bounds
    if (originalX < -halfWidth || originalX > halfWidth || originalZ < -halfDepth || originalZ > halfDepth) {
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

  const layerWidth = terrainLayer.terrain?.worldWidth ?? terrainLayer.width ?? 1
  const layerDepth = terrainLayer.terrain?.worldHeight ?? (terrainLayer as any).depth ?? terrainLayer.height ?? 1
  const halfWidth = layerWidth / 2
  const halfDepth = layerDepth / 2

  return instances.map(instance => {
    if (!instance.transform?.position) {
      return instance
    }

    const [originalX, currentY, originalZ] = instance.transform.position

    // Check if instance is within terrain bounds
    if (originalX < -halfWidth || originalX > halfWidth || originalZ < -halfDepth || originalZ > halfDepth) {
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
