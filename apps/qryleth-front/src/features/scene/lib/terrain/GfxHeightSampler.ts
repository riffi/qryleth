import type { GfxTerrainConfig, GfxHeightSampler } from '@/entities/terrain';
import { generatePerlinNoise } from '@/shared/lib/noise/perlin';

/**
 * Реализация интерфейса GfxHeightSampler для получения высот из различных источников террейна.
 * Поддерживает Perlin noise, PNG heightmaps и legacy-данные с системой модификаций через TerrainOps.
 */
export class GfxHeightSamplerImpl implements GfxHeightSampler {
  private config: GfxTerrainConfig;
  private sourceHeight: (x: number, z: number) => number;
  private sampleStep = 0.01; // шаг для вычисления нормалей через центральные разности

  /**
   * Создать сэмплер высот для заданной конфигурации террейна
   * @param config - конфигурация террейна с источником данных и параметрами
   */
  constructor(config: GfxTerrainConfig) {
    this.config = config;
    this.sourceHeight = this.createSourceFunction();
  }

  /**
   * Получить высоту в указанной точке мировых координат
   * @param x - координата X в мировой системе координат
   * @param z - координата Z в мировой системе координат
   * @returns высота Y в мировых единицах
   */
  getHeight(x: number, z: number): number {
    // 1. Базовая высота из источника
    let height = this.sourceHeight(x, z);

    // 2. Применяем операции модификации террейна (пока заглушка для фазы 2)
    if (this.config.ops && this.config.ops.length > 0) {
      // TODO: реализовать в фазе 3
      // height = this.applyTerrainOps(height, x, z);
    }

    // 3. Применяем edgeFade для плавного спада к краям
    if (this.config.edgeFade && this.config.edgeFade > 0) {
      const fadeMultiplier = this.calculateEdgeFade(x, z);
      height *= fadeMultiplier;
    }

    return height;
  }

  /**
   * Получить нормаль поверхности в указанной точке
   * Вычисляется через конечные разности (центральные)
   * @param x - координата X в мировой системе координат
   * @param z - координата Z в мировой системе координат
   * @returns нормализованный вектор нормали [nx, ny, nz]
   */
  getNormal(x: number, z: number): [number, number, number] {
    const step = this.sampleStep;
    
    // Получаем высоты соседних точек для вычисления градиента
    const heightL = this.getHeight(x - step, z);     // левая
    const heightR = this.getHeight(x + step, z);     // правая
    const heightB = this.getHeight(x, z - step);     // задняя
    const heightF = this.getHeight(x, z + step);     // передняя

    // Получаем градиент через центральные разности (используем для создания касательных векторов)

    // Создаем два касательных вектора на поверхности
    const tangentX: [number, number, number] = [2 * step, heightR - heightL, 0];
    const tangentZ: [number, number, number] = [0, heightF - heightB, 2 * step];

    // Нормаль как векторное произведение касательных векторов
    const normal: [number, number, number] = [
      tangentX[1] * tangentZ[2] - tangentX[2] * tangentZ[1],  // X компонент
      tangentX[2] * tangentZ[0] - tangentX[0] * tangentZ[2],  // Y компонент
      tangentX[0] * tangentZ[1] - tangentX[1] * tangentZ[0]   // Z компонент
    ];

    // Нормализуем вектор
    const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
    if (length > 0) {
      normal[0] /= length;
      normal[1] /= length;
      normal[2] /= length;
    } else {
      // Если длина 0, возвращаем вектор "вверх"
      return [0, 1, 0];
    }

    return normal;
  }

  /**
   * Создать функцию получения высот из базового источника данных
   * @returns функция для получения высоты по координатам из источника
   */
  private createSourceFunction(): (x: number, z: number) => number {
    const { source } = this.config;

    switch (source.kind) {
      case 'perlin':
        return this.createPerlinSource(source.params);
      
      case 'legacy':
        return this.createLegacySource(source);
      
      case 'heightmap':
        // TODO: реализовать в фазе 4
        console.warn('Heightmap source not implemented yet, using flat surface');
        return () => 0;
      
      default:
        console.warn('Unknown source type, using flat surface');
        return () => 0;
    }
  }

  /**
   * Создать функцию получения высот из Perlin noise
   * @param params - параметры генерации Perlin noise
   * @returns функция для получения высоты из Perlin noise
   */
  private createPerlinSource(params: GfxTerrainConfig['source']['params']) {
    if (params.kind !== 'perlin') {
      throw new Error('Invalid params for perlin source');
    }

    // Генерируем данные шума один раз при создании
    const noiseData = generatePerlinNoise(params.width + 1, params.height + 1, {
      octaveCount: params.octaveCount,
      amplitude: params.amplitude,
      persistence: params.persistence,
      seed: params.seed
    });

    // Используем ту же логику расчёта сегментов, что и в старой реализации
    
    return (x: number, z: number): number => {
      // Преобразуем мировые координаты в индексы массива шума
      const halfWidth = this.config.worldWidth / 2;
      const halfHeight = this.config.worldHeight / 2;
      
      // Нормализуем координаты в диапазон [0, 1]
      const normalizedX = (x + halfWidth) / this.config.worldWidth;
      const normalizedZ = (z + halfHeight) / this.config.worldHeight;
      
      // Преобразуем в индексы массива шума
      const noiseX = Math.floor(normalizedX * params.width);
      const noiseZ = Math.floor(normalizedZ * params.height);
      
      // Ограничиваем в допустимых пределах
      const clampedX = Math.max(0, Math.min(params.width, noiseX));
      const clampedZ = Math.max(0, Math.min(params.height, noiseZ));
      
      // Получаем значение из массива шума
      const noiseIndex = clampedZ * (params.width + 1) + clampedX;
      const noiseValue = noiseData[noiseIndex] || 0;
      
      // Масштабируем высоту (используем тот же коэффициент что в старой реализации)
      return noiseValue * 4;
    };
  }

  /**
   * Создать функцию получения высот из legacy данных
   * @param legacySource - legacy источник с Float32Array данными
   * @returns функция для получения высоты из legacy данных  
   */
  private createLegacySource(legacySource: { data: Float32Array; width: number; height: number }) {
    const { data, width, height } = legacySource;
    
    return (x: number, z: number): number => {
      // Аналогично логике из ObjectPlacementUtils.queryHeightAtCoordinate
      const halfWidth = this.config.worldWidth / 2;
      const halfHeight = this.config.worldHeight / 2;
      
      // Преобразуем мировые координаты в индексы массива
      const normalizedX = (x + halfWidth) / this.config.worldWidth;
      const normalizedZ = (z + halfHeight) / this.config.worldHeight;
      
      const noiseX = Math.floor(normalizedX * width);
      const noiseZ = Math.floor(normalizedZ * height);
      
      // Ограничиваем в допустимых пределах
      const clampedX = Math.max(0, Math.min(width - 1, noiseX));
      const clampedZ = Math.max(0, Math.min(height - 1, noiseZ));
      
      // Получаем значение из legacy данных
      const noiseIndex = clampedZ * width + clampedX;
      const noiseValue = data[noiseIndex] || 0;
      
      // Применяем тот же масштаб что в старой реализации
      return noiseValue * 4;
    };
  }

  /**
   * Вычислить коэффициент затухания для плавного спада к краям
   * @param x - мировая координата X
   * @param z - мировая координата Z  
   * @returns коэффициент затухания от 0 (на краю) до 1 (в центре)
   */
  private calculateEdgeFade(x: number, z: number): number {
    const halfWidth = this.config.worldWidth / 2;
    const halfHeight = this.config.worldHeight / 2;
    
    // Вычисляем расстояние от каждого края (0 на краю, 1 в центре)
    const distFromLeftEdge = (x + halfWidth) / this.config.worldWidth;
    const distFromRightEdge = (halfWidth - x) / this.config.worldWidth;
    const distFromTopEdge = (z + halfHeight) / this.config.worldHeight;
    const distFromBottomEdge = (halfHeight - z) / this.config.worldHeight;
    
    // Находим минимальное расстояние до любого края
    const edgeDistance = Math.min(
      distFromLeftEdge, 
      distFromRightEdge, 
      distFromTopEdge, 
      distFromBottomEdge
    );
    
    // Применяем настройку edgeFade - доля области от края, где происходит затухание
    const fadeDistance = this.config.edgeFade!;
    const fadeFactor = Math.max(0, Math.min(1, edgeDistance / fadeDistance));
    
    return fadeFactor;
  }
}

/**
 * Фабричная функция для создания GfxHeightSampler из конфигурации террейна
 * @param config - конфигурация террейна
 * @returns экземпляр GfxHeightSampler для работы с высотами
 */
export function createGfxHeightSampler(config: GfxTerrainConfig): GfxHeightSampler {
  return new GfxHeightSamplerImpl(config);
}