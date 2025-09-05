import type {Vector3} from '@/shared/types/vector3'
import type {BoundingBox} from '@/shared/types/boundingBox'
import type {SceneLayer, SceneObjectInstance} from '@/entities/scene/types'
import { generateUUID } from '@/shared/lib/uuid'
import { normalToRotation as normalToRotationShared } from '@/shared/lib/placement/orientation'
import { createRng } from '@/shared/lib/utils/prng'
import { PlacementStrategy, type PlacementStrategyConfig, type RandomMetadata, type RandomNoCollisionMetadata, type PlaceAroundMetadata } from './strategies'
import {
  getHeightSamplerForLayer,
  queryHeightAtCoordinate,
  calculateSurfaceNormal,
  pickLandscapeItemAt,
  getHeightSamplerForLandscapeItem,
} from './terrainAdapter'
import { useSceneStore } from '../../model/sceneStore'
import { generateRandomNoCollisionPosition as genRandomNoCollisionPosition } from './randomNoCollision'
import { generatePlaceAroundPosition as genPlaceAroundPosition } from './placeAround'

/**
 * Фасад для стратегий размещения объектов и вспомогательных операций.
 * Внутри использует модули стратегий и адаптеры работы с террейном.
 */

/**
 * Максимальный наклон (в градусах), к которому линеарно масштабируется
 * реальный наклон нормали. То есть:
 *  - угол нормали 0°  → поворот 0°,
 *  - угол нормали 90° → поворот MAX_TERRAIN_TILT_DEG.
 * Это сохраняет разнообразие наклонов и исключает эффект «упора в максимум».
 */
const MAX_TERRAIN_TILT_DEG = 30;
const MAX_TERRAIN_TILT_RAD = (Math.PI / 180) * MAX_TERRAIN_TILT_DEG;

//

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
  /** Масштаб нового объекта (если известен заранее), влияет на выравнивание по Y */
  newObjectScale?: Vector3
  /** Детеминированный генератор случайных чисел; по умолчанию Math.random */
  rng?: () => number
  /**
   * Seed для детерминированной генерации. При наличии автоматически
   * создаётся генератор случайных чисел через createRng(seed).
   * Если одновременно передан и rng, и seed — приоритет у rng.
   */
  seed?: number | string
}

export interface PlacementResult {
  position: Vector3
  strategy: PlacementStrategy
}

/**
 * Generate object placement position based on strategy (legacy version)
 */
/**
 * Сгенерировать позицию размещения объекта в зависимости от стратегии (legacy‑версия).
 *
 * В новой архитектуре (landscapeContent) при отсутствии явно переданного landscapeLayer
 * границы берутся из первой подходящей площадки ландшафта (shape='terrain'), если она есть.
 */
export const generateObjectPlacement = (options: PlacementOptions): PlacementResult => {
  const { strategy, customPosition, bounds, landscapeLayer } = options
  // Приоритет: явно переданный rng > seed > Math.random
  const rng = options.rng ?? (options.seed !== undefined ? createRng(options.seed) : Math.random)

  // Determine bounds from landscape layer if available (terrain-aware)
  let worldW = 10
  let worldH = 10
  let centerX = 0
  let centerZ = 0

  if (landscapeLayer) {
    worldW = landscapeLayer.terrain?.worldWidth ?? landscapeLayer.width ?? 10
    worldH = landscapeLayer.terrain?.worldDepth ?? landscapeLayer.depth ?? 10
    centerX = landscapeLayer.terrain?.center?.[0] ?? 0
    centerZ = landscapeLayer.terrain?.center?.[1] ?? 0
  } else {
    const content = useSceneStore.getState().landscapeContent
    const first = content?.items?.find(i => i.shape === 'terrain' && i.terrain)
    if (first) {
      worldW = first.size?.width ?? first.terrain?.worldWidth ?? worldW
      worldH = first.size?.depth ?? (first.terrain as any)?.worldDepth ?? worldH
      centerX = first.center?.[0] ?? first.terrain?.center?.[0] ?? centerX
      centerZ = first.center?.[1] ?? first.terrain?.center?.[1] ?? centerZ
    }
  }
  const defaultBounds = {
    minX: centerX - (worldW) / 2,
    maxX: centerX + (worldW) / 2,
    minZ: centerZ - (worldH) / 2,
    maxZ: centerZ + (worldH) / 2,
  }

  const finalBounds = { ...defaultBounds, ...bounds }

  switch (strategy) {
    case PlacementStrategy.Random: {
      const x = rng() * (finalBounds.maxX - finalBounds.minX) + finalBounds.minX
      const z = rng() * (finalBounds.maxZ - finalBounds.minZ) + finalBounds.minZ
      return {
        position: [x, 0, z], // Y will be adjusted by correctLLMGeneratedObject
        strategy: PlacementStrategy.Random
      }
    }

    case PlacementStrategy.RandomNoCollision: {
      const position = genRandomNoCollisionPosition({
        bounds,
        landscapeLayer,
        existingInstances: options.existingInstances,
        newObjectBoundingBox: options.newObjectBoundingBox,
        newObjectScale: options.newObjectScale,
        rng
      })
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
      const x = rng() * (finalBounds.maxX - finalBounds.minX) + finalBounds.minX
      const z = rng() * (finalBounds.maxZ - finalBounds.minZ) + finalBounds.minZ
      return {
        position: [x, 0, z],
        strategy: PlacementStrategy.Random
      }
    }

    default: {
      console.warn(`Unknown placement strategy: ${strategy}, falling back to Random`)
      const x = rng() * (finalBounds.maxX - finalBounds.minX) + finalBounds.minX
      const z = rng() * (finalBounds.maxZ - finalBounds.minZ) + finalBounds.minZ
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
    newObjectScale?: Vector3
    rng?: () => number
    /** См. правила в PlacementOptions: seed используется для создания rng, если rng не задан */
    seed?: number | string
  }
): PlacementResult => {
  const rng = options.rng ?? (options.seed !== undefined ? createRng(options.seed) : Math.random)
  // Для PlaceAround используем специальную логику
  if (placementStrategyConfig.strategy === PlacementStrategy.PlaceAround) {
    if (!options.existingInstances || !options.newObjectBoundingBox) {
      throw new Error('PlaceAround strategy requires existingInstances and newObjectBoundingBox')
    }

    const instanceIndex = options.instanceIndex ?? 0
    const totalInstancesCount = options.totalInstancesCount ?? 1

    const position = genPlaceAroundPosition(
      placementStrategyConfig.metadata,
      options.existingInstances,
      options.newObjectBoundingBox,
      instanceIndex,
      totalInstancesCount,
      rng
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
    newObjectBoundingBox: options.newObjectBoundingBox,
    newObjectScale: options.newObjectScale,
    rng
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

/**
 * Вычислить поверхностную нормаль в заданной точке мировых координат для данного слоя.
 * Использует унифицированный GfxHeightSampler для всех типов источников террейна.
 * @param layer - слой сцены (должен быть landscape типа)
 * @param worldX - координата X в мировой системе координат
 * @param worldZ - координата Z в мировой системе координат
 * @returns вектор нормали [x, y, z] ([0, 1, 0] для не-terrain слоев)
 */

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
const normalToRotation = (normal: Vector3, maxTiltRad?: number): Vector3 => normalToRotationShared(normal, maxTiltRad ?? MAX_TERRAIN_TILT_RAD)

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

/**
 * Валидировать параметры PlaceAround метаданных
 * @param metadata - метаданные PlaceAround для валидации
 * @throws Error если параметры невалидны
 */

/**
 * Check if two bounding boxes intersect
 */

/**
 * Generate random position without collisions
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
// placeInstanceLegacy удалён как неиспользуемый

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
    if (options.alignToTerrainHeight) {
      let heightY = 0
      if (options.landscapeLayer) {
        heightY = queryHeightAtCoordinate(
          options.landscapeLayer,
          placementResult.position[0],
          placementResult.position[2]
        );
      } else {
        const picked = pickLandscapeItemAt(placementResult.position[0], placementResult.position[2])
        if (picked?.item) {
          const sampler = getHeightSamplerForLandscapeItem(picked.item)
          if (sampler) heightY = sampler.getHeight(placementResult.position[0], placementResult.position[2])
        }
      }
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
    if (options.alignToTerrainRotation) {
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

      let surfaceNormal: Vector3 = [0, 1, 0]
      if (options.landscapeLayer) {
        surfaceNormal = calculateSurfaceNormal(
          options.landscapeLayer,
          placementResult.position[0],
          placementResult.position[2]
        );
      } else {
        const picked = pickLandscapeItemAt(placementResult.position[0], placementResult.position[2])
        if (picked?.item) {
          const sampler = getHeightSamplerForLandscapeItem(picked.item)
          if (sampler) surfaceNormal = sampler.getNormal(placementResult.position[0], placementResult.position[2])
        }
      }

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
// legacy функции adjustAllInstancesForPerlinTerrain / adjustAllInstancesForTerrainAsync удалены

/**
 * Асинхронная коррекция Y‑координаты инстансов по ландшафтному содержимому (новая архитектура).
 *
 * Алгоритм:
 * - Собирает все площадки shape='terrain' из landscapeContent, создаёт для них сэмплеры.
 * - Дожидается готовности heightmap‑сэмплеров (ready), если требуется.
 * - Для каждого инстанса находит подходящую площадку по AABB и корректирует Y по высоте террейна.
 * - При наличии bounding box объекта учитывает нижнюю грань (смещение по Y).
 */
export const adjustAllInstancesForLandscapeContentAsync = async (
  instances: SceneObjectInstance[],
  objects?: Array<{ uuid: string; boundingBox?: import('@/shared/types').BoundingBox }>
): Promise<SceneObjectInstance[]> => {
  const content = useSceneStore.getState().landscapeContent
  const items = content?.items?.filter(i => i.shape === 'terrain' && !!i.terrain) || []
  if (items.length === 0) return instances

  // Создаём сэмплеры и ждём готовности всех heightmap при необходимости
  const samplers = items.map(it => ({ it, sampler: getHeightSamplerForLandscapeItem(it)! }))
  const waiters: Promise<void>[] = []
  for (const { it, sampler } of samplers) {
    if (it.terrain?.source.kind === 'heightmap' && sampler?.isReady && sampler?.isReady() === false && sampler.ready) {
      waiters.push(sampler.ready())
    }
  }
  if (waiters.length > 0) await Promise.all(waiters)

  // Корректируем инстансы
  return instances.map(inst => {
    const pos = inst.transform?.position
    if (!pos) return inst
    const [x, y, z] = pos
    const picked = pickLandscapeItemAt(x, z)
    if (!picked?.item) return inst
    const sampler = samplers.find(s => s.it.id === picked.item.id)?.sampler
    if (!sampler) return inst
    let terrainY = sampler.getHeight(x, z)
    if (objects) {
      const ob = objects.find(o => o.uuid === inst.objectUuid)
      if (ob?.boundingBox) {
        const scale = inst.transform?.scale || [1, 1, 1]
        const bottomOffset = ob.boundingBox.min[1] * scale[1]
        terrainY -= bottomOffset
      }
    }
    return { ...inst, transform: { ...inst.transform, position: [x, terrainY, z] as Vector3 } }
  })
}

// Реэкспорт стратегий и типов метаданных для совместимости внешних импортов
export { PlacementStrategy } from './strategies'
export type { PlacementStrategyConfig, RandomMetadata, RandomNoCollisionMetadata, PlaceAroundMetadata } from './strategies'
