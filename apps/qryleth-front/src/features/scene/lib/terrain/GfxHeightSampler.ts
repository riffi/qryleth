import type { GfxTerrainConfig, GfxHeightSampler, GfxTerrainOp, GfxPerlinParams, GfxHeightmapParams } from '@/entities/terrain';
import { createPerlinSource } from './heightSources/PerlinSource';
import { sampleHeightFromHeightsField, sampleHeightFromImageData } from './heightSources/HeightmapSource';
import { buildSpatialIndex, getRelevantOps } from './ops/spatialIndex';
import { applyTerrainOpsOptimized as applyTerrainOpsOptimizedFn } from './ops/applyOps';
import { calculateEdgeFade } from './effects/edgeFade';
import { getCachedImageData, getCachedHeightsField, loadHeightsField, loadImageData } from './assets/heightmapCache';
// Константы геометрии теперь используются в GeometryBuilder
// Флаг отладки: в продакшене подавляем подробные логи
const DEBUG = (import.meta as any)?.env?.MODE !== 'production';

// Кэши и загрузчики вынесены в assets/heightmapCache.ts

/**
 * Реализация интерфейса GfxHeightSampler для получения высот из различных источников террейна.
 * Поддерживает Perlin noise и PNG heightmaps с системой модификаций через TerrainOps.
 */
export class GfxHeightSamplerImpl implements GfxHeightSampler {
  private config: GfxTerrainConfig;
  private sourceHeight: (x: number, z: number) => number;
  private sampleStep = 0.01; // динамический шаг для нормалей (обновляется по разрешению источника)
  
  // Оптимизация: пространственный индекс для быстрого поиска релевантных операций
  private spatialIndex?: Map<string, GfxTerrainOp[]>;
  private spatialCellSize = 10; // размер ячейки пространственного индекса в мировых координатах
  
  // Кэширование результатов
  private heightCache = new Map<string, number>();
  private cacheEnabled = true;
  private maxCacheSize = 10000; // максимальный размер кэша

  // Данные heightmap (кэшируются при первом обращении)
  private heightmapImageData?: ImageData;
  private heightmapLoadPromise?: Promise<ImageData>;
  private onHeightmapLoadedCallback?: () => void;

  // Данные предвычисленного поля высот (предпочтительный источник для heightmap)
  private heightsField?: { heights: Float32Array; width: number; height: number };
  private heightsLoadPromise?: Promise<{ heights: Float32Array; width: number; height: number }>;
  // Флаги, предотвращающие спам логов и повторные подписки/инициации загрузки
  private notReadyLogged = false;
  private imageLoadInitiated = false;
  private heightsLoadInitiated = false;

  /**
   * Создать сэмплер высот для заданной конфигурации террейна
   * @param config - конфигурация террейна с источником данных и параметрами
   *
   * Примечание: если источник — heightmap и соответствующий ImageData уже
   * находится в глобальном кэше, он будет подставлен сразу, чтобы первая
   * генерация геометрии использовала реальные высоты без ожидания.
   */
  constructor(config: GfxTerrainConfig) {
    this.config = config;
    // Если источник — heightmap, пробуем подставить кэшированные данные:
    // 1) сначала числовое поле высот (heights),
    // 2) если нет — ImageData как фоллбэк.
    if (this.config.source.kind === 'heightmap') {
      const assetId = this.config.source.params.assetId
      const cachedHeights = getCachedHeightsField(assetId)
      if (cachedHeights) {
        this.heightsField = cachedHeights
      } else {
        const cachedImg = getCachedImageData(assetId)
        if (cachedImg) this.heightmapImageData = cachedImg
      }
    }
    this.sourceHeight = this.createSourceFunction();
    this.updateSampleStepBasedOnSource();
    this.buildSpatialIndex();
  }

  /**
   * Получить высоту в указанной точке мировых координат
   * @param x - координата X в мировой системе координат
   * @param z - координата Z в мировой системе координат
   * @returns высота Y в мировых единицах
   */
  getHeight(x: number, z: number): number {
    // Проверяем кэш (с округлением координат для стабильности)
    if (this.cacheEnabled) {
      const cacheKey = this.getCacheKey(x, z);
      const cachedHeight = this.heightCache.get(cacheKey);
      if (cachedHeight !== undefined) {
        return cachedHeight;
      }
    }

    // 1. Базовая высота из источника
    let height = this.sourceHeight(x, z);

    // 2. Применяем операции модификации террейна
    if (this.config.ops && this.config.ops.length > 0) {
      height = this.applyTerrainOpsOptimized(height, x, z);
    }

    // 3. Применяем edgeFade для плавного спада к краям
    if (this.config.edgeFade && this.config.edgeFade > 0) {
      const fadeMultiplier = calculateEdgeFade(
        x,
        z,
        this.config.worldWidth,
        this.config.worldHeight,
        this.config.edgeFade
      )
      height *= fadeMultiplier
    }

    // Сохраняем в кэш
    if (this.cacheEnabled) {
      this.setCachedHeight(x, z, height);
    }

    return height;
  }

  /**
   * Получить нормаль поверхности в указанной точке.
   *
   * Метод использует центральные разности по X и Z с динамическим шагом выборки
   * `sampleStep`, зависящим от разрешения источника высот. Это даёт устойчивые
   * и «масштабно-инвариантные» нормали для разных размеров мира и сеток.
   *
   * Алгоритм:
   * - Вычисляем четыре соседних значения высоты: слева/справа и сзади/спереди.
   * - Формируем два касательных вектора на поверхности и берём их векторное произведение.
   * - Нормализуем результат; в вырожденном случае возвращаем [0,1,0].
   */
  getNormal(x: number, z: number): [number, number, number] {
    const step = this.sampleStep

    const heightL = this.getHeight(x - step, z)
    const heightR = this.getHeight(x + step, z)
    const heightB = this.getHeight(x, z - step)
    const heightF = this.getHeight(x, z + step)

    const tangentX: [number, number, number] = [2 * step, heightR - heightL, 0]
    const tangentZ: [number, number, number] = [0, heightF - heightB, 2 * step]

    const normal: [number, number, number] = [
      tangentX[1] * tangentZ[2] - tangentX[2] * tangentZ[1],
      tangentX[2] * tangentZ[0] - tangentX[0] * tangentZ[2],
      tangentX[0] * tangentZ[1] - tangentX[1] * tangentZ[0]
    ]

    const length = Math.hypot(normal[0], normal[1], normal[2])
    if (length <= 1e-8) return [0, 1, 0]
    return [normal[0] / length, normal[1] / length, normal[2] / length]
  }

  /**
   * Обновляет динамический шаг выборки `sampleStep` для нормалей,
   * исходя из фактического разрешения источника высот.
   *
   * Формула:
   *  - gridW/gridH — размеры решётки источника (Perlin: params.width/height;
   *    Heightmap: heightsField.width/height либо ImageData.width/height,
   *    либо параметры imgWidth/imgHeight, если данные ещё не загружены).
   *  - base = min(worldW/(gridW-1), worldH/(gridH-1)).
   *  - Ограничения: stepMin = worldMin/1000, stepMax = worldMin/10.
   *  - sampleStep = clamp(base, stepMin, stepMax).
   */
  private updateSampleStepBasedOnSource(): void {
    const worldW = Math.max(1e-6, this.config.worldWidth)
    const worldH = Math.max(1e-6, this.config.worldHeight)
    const worldMin = Math.min(worldW, worldH)

    let gridW = 2
    let gridH = 2

    if (this.config.source.kind === 'perlin') {
      gridW = Math.max(2, this.config.source.params.width)
      gridH = Math.max(2, this.config.source.params.height)
    } else {
      if (this.heightsField) {
        gridW = Math.max(2, this.heightsField.width)
        gridH = Math.max(2, this.heightsField.height)
      } else if (this.heightmapImageData) {
        gridW = Math.max(2, this.heightmapImageData.width)
        gridH = Math.max(2, this.heightmapImageData.height)
      } else {
        gridW = Math.max(2, this.config.source.params.imgWidth)
        gridH = Math.max(2, this.config.source.params.imgHeight)
      }
    }

    const cellW = worldW / Math.max(1, gridW - 1)
    const cellH = worldH / Math.max(1, gridH - 1)
    const base = Math.min(cellW, cellH)

    const stepMin = worldMin / 1000
    const stepMax = worldMin / 10
    this.sampleStep = Math.max(stepMin, Math.min(stepMax, base))
  }

  /**
   * Установить callback который будет вызван когда heightmap данные загрузятся
   */
  onHeightmapLoaded(callback: () => void): void {
    // Сохраняем колбэк
    this.onHeightmapLoadedCallback = callback;
    // Если данные уже готовы (heights или ImageData) — вызываем колбэк немедленно,
    // чтобы UI мог закрыть прелоадер без ожидания повторной загрузки.
    if (this.heightsField || this.heightmapImageData) {
      // Вызываем в следующем тике, чтобы избежать синхронных эффектов в момент подписки
      setTimeout(() => {
        try {
          this.onHeightmapLoadedCallback && this.onHeightmapLoadedCallback();
        } catch (e) {
          // подавляем ошибки пользовательского колбэка
          if (DEBUG) console.warn('onHeightmapLoaded immediate callback error:', e);
        }
      }, 0);
    }
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
      case 'heightmap':
        if (DEBUG) console.log('🗻 Creating HeightmapSource with params:', source.params);
        return this.createHeightmapSource(source.params);
      
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
  private createPerlinSource(params: GfxPerlinParams) {
    return createPerlinSource(params, { worldWidth: this.config.worldWidth, worldHeight: this.config.worldHeight })
  }

  // legacy-источник удалён (см. 022-terrain-architecture-refactor, фаза 1)

  /**
   * Создать функцию получения высот из PNG heightmap с bilinear интерполяцией
   * @param params - параметры heightmap источника
   * @returns функция для получения высоты из heightmap с нормализацией и UV wrapping
   */
  private createHeightmapSource(params: GfxHeightmapParams) {
    if (DEBUG) console.log('🗻 createHeightmapSource called with params:', params);
    return (x: number, z: number): number => {
      // 1) Предпочитаем числовое поле высот (если доступно). Если нет — инициируем загрузку/миграцию.
      if (!this.heightsField) {
        const cached = getCachedHeightsField(params.assetId)
        if (cached) {
          this.heightsField = cached
          this.heightCache.clear()
        } else {
          this.loadHeightsFieldIfNeeded(params.assetId)
        }
      }

      // 2) Если heights уже доступны — используем их для семплинга
      if (this.heightsField) {
        // Преобразование мировых координат → UV [0..1]
        return sampleHeightFromHeightsField(
          x,
          z,
          this.config.worldWidth,
          this.config.worldHeight,
          params,
          this.heightsField.heights,
          this.heightsField.width,
          this.heightsField.height
        )
      }

      // 3) Фоллбэк: если нет heights — работаем по старому пути через ImageData
      if (!this.heightmapImageData) {
        const cached = getCachedImageData(params.assetId);
        if (cached) {
          this.heightmapImageData = cached;
        } else {
          // Асинхронно грузим ImageData и возвращаем 0 до завершения
          if (DEBUG && !this.notReadyLogged) {
            console.log('🗻 height source not ready (heights/ImageData); loading assetId:', params.assetId);
            this.notReadyLogged = true;
          }
          this.loadHeightmapImageDataIfNeeded(params.assetId);
          return 0;
        }
      }

      // Преобразуем мировые координаты в UV → пиксели под размеры изображения
      // Подробный лог выборок по каждому сэмплу убран во избежание спама

      // Преобразуем мировые координаты в UV координаты [0, 1]
      return sampleHeightFromImageData(
        x,
        z,
        this.config.worldWidth,
        this.config.worldHeight,
        params,
        this.heightmapImageData!
      );
    };
  }

  /**
   * Загружает ImageData для heightmap асинхронно (если еще не загружена)
   * @param assetId - идентификатор terrain asset
   */
  private loadHeightmapImageDataIfNeeded(assetId: string): void {
    // Уже загружено в инстансе — ничего делать не нужно
    if (this.heightmapImageData) return;
    // Уже инициировано или есть локальный промис — избегаем повторной подписки
    if (this.imageLoadInitiated || this.heightmapLoadPromise) return;

    // Если уже есть активный промис загрузки для этого assetId — используем его
    // Инициируем загрузку через общий кэш загрузок
    const promise = loadImageData(assetId)
      .then(imageData => {
        if (DEBUG) console.log('🗻 Heightmap ImageData loaded successfully:', imageData.width, 'x', imageData.height);
        this.heightmapImageData = imageData;
        this.heightCache.clear();
        this.updateSampleStepBasedOnSource();
        if (this.onHeightmapLoadedCallback) this.onHeightmapLoadedCallback();
        return imageData;
      })
      .finally(() => {
        this.heightmapLoadPromise = undefined;
        this.imageLoadInitiated = false;
      });

    this.heightmapLoadPromise = promise;
    this.imageLoadInitiated = true;
  }

  /**
   * Асинхронно загружает числовое поле высот (Float32Array) из Dexie (с ленивой миграцией при необходимости).
   * 
   * Использует общий реестр промисов, чтобы несколько инстансов сэмплера ожидали один и тот же
   * запрос. При успешной загрузке:
   * - сохраняет результат в глобальном кэше (см. assets/heightmapCache),
   * - привязывает поле высот к текущему инстансу,
   * - очищает локальный кэш высот this.heightCache, чтобы пересчитать значения с новым источником,
   * - вызывает onHeightmapLoadedCallback для триггера перегенерации геометрии в UI.
   */
  private loadHeightsFieldIfNeeded(assetId: string): void {
    if (this.heightsField) return;
    if (this.heightsLoadInitiated || this.heightsLoadPromise) return;

    const promise = loadHeightsField(assetId)
      .then((res) => {
        if (res) {
          this.heightsField = res;
          this.heightCache.clear();
          this.updateSampleStepBasedOnSource();
          if (this.onHeightmapLoadedCallback) this.onHeightmapLoadedCallback();
        }
        return res;
      })
      .finally(() => {
        this.heightsLoadPromise = undefined;
        this.heightsLoadInitiated = false;
      });

    this.heightsLoadPromise = promise;
    this.heightsLoadInitiated = true;
  }

  // Билинейная интерполяция ImageData вынесена в sampling/bilinear.ts

  /**
   * Выполняет билинейную интерполяцию по «полю высот» (числовому массиву),
   * хранящемуся в Dexie как Float32Array. Предпочтительный путь семплинга для
   * heightmap-источника, так как избавляет от пересчёта яркости пикселей и
   * экономит время за счёт прямого доступа к нормализованным значениям высот.
   *
   * Алгоритм:
   * - По дробным координатам (pixelX, pixelY) находим четыре соседних узла
   *   (x0,y0), (x1,y0), (x0,y1), (x1,y1) в решётке высот.
   * - Смешиваем значения по X (верхняя и нижняя стороны), затем по Y — получаем
   *   итоговую интерполированную высоту.
   * - Приводим результат к диапазону [min..max] из параметров heightmap.
   *
   * Важно: метод не делает «оборачивание» координат — обрезка/повтор уже
   * выполнены на стадии преобразования мировых координат в UV (см. вызов).
   *
   * @param pixelX - X-координата в «пиксельном» пространстве решётки высот (может быть дробной)
   * @param pixelY - Y-координата в «пиксельном» пространстве решётки высот (может быть дробной)
   * @param heights - массив высот длиной width*height
   * @param width - ширина решётки высот
   * @param height - высота решётки высот
   * @param params - параметры нормализации высоты (min/max)
   * @returns интерполированная высота в мировых единицах
   */
  // Билинейная интерполяция числового поля вынесена в sampling/bilinear.ts

  /**
   * Вычислить коэффициент затухания для плавного спада к краям
   * @param x - мировая координата X
   * @param z - мировая координата Z  
   * @returns коэффициент затухания от 0 (на краю) до 1 (в центре)
   */
  // EdgeFade вынесен в effects/edgeFade.ts

  /**
   * Построить пространственный индекс для быстрого поиска операций террейна
   * Разбивает все операции по ячейкам сетки для оптимизированного поиска
   */
  private buildSpatialIndex(): void {
    if (!this.config.ops || this.config.ops.length === 0) return
    this.spatialIndex = buildSpatialIndex(this.config.ops, this.spatialCellSize)
  }

  /**
   * Получить ключ для кэширования координат (с округлением)
   * @param x - координата X
   * @param z - координата Z
   * @returns ключ для кэша
   */
  private getCacheKey(x: number, z: number): string {
    // Округляем координаты для стабильного кэширования
    const roundedX = Math.round(x * 100) / 100;
    const roundedZ = Math.round(z * 100) / 100;
    return `${roundedX},${roundedZ}`;
  }

  /**
   * Сохранить высоту в кэш с ограничением размера
   * @param x - координата X
   * @param z - координата Z  
   * @param height - вычисленная высота
   */
  private setCachedHeight(x: number, z: number, height: number): void {
    // Ограничиваем размер кэша
    if (this.heightCache.size >= this.maxCacheSize) {
      // Удаляем случайный элемент (простая стратегия)
      const firstKey = this.heightCache.keys().next().value;
      if (firstKey) {
        this.heightCache.delete(firstKey);
      }
    }

    const cacheKey = this.getCacheKey(x, z);
    this.heightCache.set(cacheKey, height);
  }

  /**
   * Получить релевантные операции для точки с использованием пространственного индекса
   * @param x - координата X в мировых координатах
   * @param z - координата Z в мировых координатах
   * @returns массив потенциально релевантных операций
   */
  // Получение релевантных операций вынесено в ops/spatialIndex.ts

  /**
   * Оптимизированное применение операций террейна с использованием пространственного индекса
   * @param baseHeight - базовая высота из источника
   * @param x - координата X в мировых координатах
   * @param z - координата Z в мировых координатах
   * @returns модифицированная высота после применения всех операций
   */
  private applyTerrainOpsOptimized(baseHeight: number, x: number, z: number): number {
    let height = baseHeight;
    const relevantOps = this.spatialIndex ? getRelevantOps(this.spatialIndex, this.spatialCellSize, x, z) : (this.config.ops || [])
    return applyTerrainOpsOptimizedFn(height, x, z, relevantOps);
  }

  /**
   * Применить массив операций модификации террейна к базовой высоте
   * @param baseHeight - базовая высота из источника
   * @param x - координата X в мировых координатах
   * @param z - координата Z в мировых координатах
   * @returns модифицированная высота после применения всех операций
   * @deprecated Используйте applyTerrainOpsOptimized для лучшей производительности
   */
  // Базовый вариант применения операций перенесён в ops/applyOps.ts

  /**
   * Вычислить вклад одной операции модификации террейна в точке
   * @param op - операция модификации террейна
   * @param x - координата X в мировых координатах
   * @param z - координата Z в мировых координатах
   * @returns значение вклада операции (может быть 0 если точка вне радиуса влияния)
   */
  // Расчёт вклада операции вынесен в ops/applyOps.ts

  /**
   * Вычислить нормализованное расстояние от центра операции с учетом эллипса и поворота
   * @param op - операция модификации террейна
   * @param x - координата X в мировых координатах  
   * @param z - координата Z в мировых координатах
   * @returns нормализованное расстояние (0 в центре, 1+ за пределами влияния)
   */
  // Расстояние до центра операции вынесено в ops/applyOps.ts

  /**
   * Применить функцию затухания к нормализованному расстоянию
   * @param t - нормализованное расстояние от центра операции (0..1+)
   * @param falloff - тип функции затухания
   * @returns значение затухания (1 в центре, 0+ на краях и за пределами)
   */
  // Функции затухания вынесены в ops/applyOps.ts
}

/**
 * Фабричная функция для создания GfxHeightSampler из конфигурации террейна
 * @param config - конфигурация террейна
 * @returns экземпляр GfxHeightSampler для работы с высотами
 */
export function createGfxHeightSampler(config: GfxTerrainConfig): GfxHeightSampler {
  return new GfxHeightSamplerImpl(config);
}

/**
 * Создать THREE.js геометрию для террейна на основе GfxHeightSampler
 * @param cfg - конфигурация террейна
 * @param sampler - сэмплер высот для получения данных о рельефе
 * @returns THREE.BufferGeometry с вершинами, соответствующими террейну
 */
// buildGfxTerrainGeometry/decideSegments перенесены в GeometryBuilder.ts (фаза 2)
