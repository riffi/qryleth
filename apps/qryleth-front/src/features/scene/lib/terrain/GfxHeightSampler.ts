import * as THREE from 'three';
import type { GfxTerrainConfig, GfxHeightSampler, GfxTerrainOp, GfxPerlinParams, GfxHeightmapParams } from '@/entities/terrain';
import { generatePerlinNoise } from '@/shared/lib/noise/perlin';
import { loadTerrainAssetImageData, loadTerrainHeightsFromAsset } from './HeightmapUtils';
import { TERRAIN_MAX_SEGMENTS } from '../../config/terrain';
// Флаг отладки: в продакшене подавляем подробные логи
const DEBUG = (import.meta as any)?.env?.MODE !== 'production';

/**
 * Глобальный кэш ImageData для heightmap по assetId.
 * Нужен, чтобы повторные инстансы сэмплера (после ререндера React) не ждали повторную
 * асинхронную загрузку и могли немедленно применять корректные высоты.
 */
const HEIGHTMAP_IMAGE_CACHE: Map<string, ImageData> = new Map();
/**
 * Глобальный кэш активных промисов загрузки по assetId.
 * Позволяет нескольким инстансам сэмплера дожидаться одной и той же загрузки,
 * не создавая дубликаты запросов к Dexie.
 */
const HEIGHTMAP_LOAD_PROMISES: Map<string, Promise<ImageData>> = new Map();

/**
 * Глобальный кэш числовых высот по assetId.
 * Используется, когда heights уже сохранены в Dexie (предпочтительный путь).
 */
const HEIGHTS_FIELD_CACHE: Map<string, { heights: Float32Array; width: number; height: number }> = new Map();

/**
 * Глобальный реестр активных промисов загрузки числовых высот по assetId.
 * Нужен, чтобы несколько инстансов сэмплера не дублировали запросы к Dexie,
 * а ожидали один и тот же результат (включая «ленивую миграцию» из PNG).
 */
const HEIGHTS_FIELD_LOAD_PROMISES: Map<string, Promise<{ heights: Float32Array; width: number; height: number }>> = new Map();

/**
 * Реализация интерфейса GfxHeightSampler для получения высот из различных источников террейна.
 * Поддерживает Perlin noise, PNG heightmaps и legacy-данные с системой модификаций через TerrainOps.
 */
export class GfxHeightSamplerImpl implements GfxHeightSampler {
  private config: GfxTerrainConfig;
  private sourceHeight: (x: number, z: number) => number;
  private sampleStep = 0.01; // шаг для вычисления нормалей через центральные разности
  
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
      const assetId = this.config.source.params.assetId;
      const cachedHeights = HEIGHTS_FIELD_CACHE.get(assetId);
      if (cachedHeights) {
        this.heightsField = cachedHeights;
      } else {
        const cachedImg = HEIGHTMAP_IMAGE_CACHE.get(assetId);
        if (cachedImg) {
          this.heightmapImageData = cachedImg;
        }
      }
    }
    this.sourceHeight = this.createSourceFunction();
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
      const fadeMultiplier = this.calculateEdgeFade(x, z);
      height *= fadeMultiplier;
    }

    // Сохраняем в кэш
    if (this.cacheEnabled) {
      this.setCachedHeight(x, z, height);
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
      
      case 'legacy':
        return this.createLegacySource(source);
      
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
   * Создать функцию получения высот из PNG heightmap с bilinear интерполяцией
   * @param params - параметры heightmap источника
   * @returns функция для получения высоты из heightmap с нормализацией и UV wrapping
   */
  private createHeightmapSource(params: GfxHeightmapParams) {
    if (DEBUG) console.log('🗻 createHeightmapSource called with params:', params);
    return (x: number, z: number): number => {
      // 1) Предпочитаем числовое поле высот (если доступно). Если нет — инициируем загрузку/миграцию.
      if (!this.heightsField) {
        const cached = HEIGHTS_FIELD_CACHE.get(params.assetId);
        if (cached) {
          this.heightsField = cached;
          // При переключении источника на более точный — сбрасываем локальный кэш высот
          this.heightCache.clear();
        } else {
          // Запускаем (или присоединяемся к) загрузку числовых высот
          this.loadHeightsFieldIfNeeded(params.assetId);
        }
      }

      // 2) Если heights уже доступны — используем их для семплинга
      if (this.heightsField) {
        // Преобразование мировых координат → UV [0..1]
        const halfWidth = this.config.worldWidth / 2;
        const halfHeight = this.config.worldHeight / 2;
        let u = (x + halfWidth) / this.config.worldWidth;
        let v = (z + halfHeight) / this.config.worldHeight;
        const wrap = params.wrap || 'clamp';
        switch (wrap) {
          case 'repeat':
            u = u - Math.floor(u);
            v = v - Math.floor(v);
            if (u < 0) u += 1;
            if (v < 0) v += 1;
            break;
          case 'clamp':
          default:
            u = Math.max(0, Math.min(1, u));
            v = Math.max(0, Math.min(1, v));
            break;
        }
        // Перевод UV → координаты в сетке высот
        const pixelX = u * (this.heightsField.width - 1);
        const pixelY = v * (this.heightsField.height - 1);
        return this.sampleHeightsFieldBilinear(pixelX, pixelY, this.heightsField.heights, this.heightsField.width, this.heightsField.height, params);
      }

      // 3) Фоллбэк: если нет heights — работаем по старому пути через ImageData
      if (!this.heightmapImageData) {
        const cached = HEIGHTMAP_IMAGE_CACHE.get(params.assetId);
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
      const halfWidth = this.config.worldWidth / 2;
      const halfHeight = this.config.worldHeight / 2;
      
      let u = (x + halfWidth) / this.config.worldWidth;
      let v = (z + halfHeight) / this.config.worldHeight;

      // Применяем UV wrapping
      const wrap = params.wrap || 'clamp';
      switch (wrap) {
        case 'repeat':
          u = u - Math.floor(u); // оставляем только дробную часть
          v = v - Math.floor(v);
          if (u < 0) u += 1; // для отрицательных значений
          if (v < 0) v += 1;
          break;
        case 'clamp':
        default:
          u = Math.max(0, Math.min(1, u));
          v = Math.max(0, Math.min(1, v));
          break;
      }

      // Преобразуем UV в пиксельные координаты
      const pixelX = u * (params.imgWidth - 1);
      const pixelY = v * (params.imgHeight - 1);

      // Биlinear интерполяция
      const height = this.sampleHeightmapBilinear(pixelX, pixelY, params);
      
      return height;
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
    const ongoing = HEIGHTMAP_LOAD_PROMISES.get(assetId);
    if (ongoing) {
      this.imageLoadInitiated = true;
      // Присоединяемся один раз к завершению для установки данных в текущем инстансе
      this.heightmapLoadPromise = ongoing.then(imageData => {
        if (!this.heightmapImageData) {
          this.heightmapImageData = imageData;
          this.heightCache.clear();
          if (this.onHeightmapLoadedCallback) this.onHeightmapLoadedCallback();
        }
        return imageData;
      });
      return;
    }

    // Иначе инициируем новую загрузку и положим её в общий кэш промисов
    const promise = loadTerrainAssetImageData(assetId)
      .then(imageData => {
        if (DEBUG) console.log('🗻 Heightmap ImageData loaded successfully:', imageData.width, 'x', imageData.height);
        // Сохраняем в глобальный кэш для всех будущих инстансов
        HEIGHTMAP_IMAGE_CACHE.set(assetId, imageData);
        // Привязываем к текущему инстансу
        this.heightmapImageData = imageData;
        // Очищаем кэш высот, чтобы пересчитать с новыми данными heightmap
        this.heightCache.clear();
        // Уведомляем о том, что данные загружены
        if (this.onHeightmapLoadedCallback) {
          if (DEBUG) console.log('🗻 Calling onHeightmapLoaded callback');
          this.onHeightmapLoadedCallback();
        }
        return imageData;
      })
      .catch(error => {
        console.error('Ошибка загрузки heightmap:', error);
        throw error;
      })
      .finally(() => {
        // Убираем промис из общего реестра после завершения (успешного или с ошибкой)
        HEIGHTMAP_LOAD_PROMISES.delete(assetId);
        this.heightmapLoadPromise = undefined;
        this.imageLoadInitiated = false;
      });

    HEIGHTMAP_LOAD_PROMISES.set(assetId, promise);
    this.heightmapLoadPromise = promise;
  }

  /**
   * Асинхронно загружает числовое поле высот (Float32Array) из Dexie (с ленивой миграцией при необходимости).
   * 
   * Использует общий реестр промисов, чтобы несколько инстансов сэмплера ожидали один и тот же
   * запрос. При успешной загрузке:
   * - сохраняет результат в глобальном кэше HEIGHTS_FIELD_CACHE,
   * - привязывает поле высот к текущему инстансу,
   * - очищает локальный кэш высот this.heightCache, чтобы пересчитать значения с новым источником,
   * - вызывает onHeightmapLoadedCallback для триггера перегенерации геометрии в UI.
   */
  private loadHeightsFieldIfNeeded(assetId: string): void {
    if (this.heightsField) return;
    if (this.heightsLoadInitiated || this.heightsLoadPromise) return;

    const ongoing = HEIGHTS_FIELD_LOAD_PROMISES.get(assetId);
    if (ongoing) {
      this.heightsLoadInitiated = true;
      this.heightsLoadPromise = ongoing.then((res) => {
        this.heightsField = res;
        this.heightCache.clear();
        if (this.onHeightmapLoadedCallback) this.onHeightmapLoadedCallback();
        return res;
      });
      return;
    }

    const promise = loadTerrainHeightsFromAsset(assetId)
      .then((res) => {
        if (!res) {
          // heights ещё нет — ничего не делаем; фоллбэк продолжит работать по ImageData
          return Promise.reject(new Error('Heights not available yet'));
        }
        // Кладём в глобальный кэш и привязываем к инстансу
        HEIGHTS_FIELD_CACHE.set(assetId, res);
        this.heightsField = res;
        // Сбрасываем локальные кэши высот — переключились на новый источник данных
        this.heightCache.clear();
        if (this.onHeightmapLoadedCallback) this.onHeightmapLoadedCallback();
        return res;
      })
      .catch((err) => {
        // Не фейлим пайплайн семплинга — оставляем фоллбэк через ImageData
        console.warn('Не удалось загрузить числовые высоты (heights). Будет использован ImageData fallback.', err);
        return Promise.reject(err);
      })
      .finally(() => {
        HEIGHTS_FIELD_LOAD_PROMISES.delete(assetId);
        this.heightsLoadPromise = undefined;
        this.heightsLoadInitiated = false;
      });

    HEIGHTS_FIELD_LOAD_PROMISES.set(assetId, promise);
    this.heightsLoadPromise = promise;
  }

  /**
   * Выполняет bilinear интерполяцию высоты из heightmap ImageData
   * @param pixelX - X координата в пикселях (может быть дробной)
   * @param pixelY - Y координата в пикселях (может быть дробной)
   * @param params - параметры heightmap для нормализации высоты
   * @returns интерполированная высота в мировых единицах
   */
  private sampleHeightmapBilinear(pixelX: number, pixelY: number, params: GfxHeightmapParams): number {
    if (!this.heightmapImageData) {
      return 0;
    }

    const { data, width, height } = this.heightmapImageData;
    
    // Находим 4 соседних пикселя для интерполяции
    const x0 = Math.floor(pixelX);
    const y0 = Math.floor(pixelY);
    const x1 = Math.min(x0 + 1, width - 1);
    const y1 = Math.min(y0 + 1, height - 1);

    // Вычисляем веса для интерполяции
    const wx = pixelX - x0;
    const wy = pixelY - y0;

    // Получаем яркость 4 соседних пикселей (используем формулу luminance)
    const getPixelLuminance = (x: number, y: number): number => {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // Стандартная формула luminance
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const h00 = getPixelLuminance(x0, y0); // левый верхний
    const h10 = getPixelLuminance(x1, y0); // правый верхний  
    const h01 = getPixelLuminance(x0, y1); // левый нижний
    const h11 = getPixelLuminance(x1, y1); // правый нижний

    // Bilinear интерполяция
    const h0 = h00 * (1 - wx) + h10 * wx; // интерполяция по верхней стороне
    const h1 = h01 * (1 - wx) + h11 * wx; // интерполяция по нижней стороне
    const interpolatedHeight = h0 * (1 - wy) + h1 * wy; // финальная интерполяция

    // Нормализуем значение из диапазона [0, 255] в [min, max]
    const normalizedHeight = (interpolatedHeight / 255) * (params.max - params.min) + params.min;
    
    return normalizedHeight;
  }

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
  private sampleHeightsFieldBilinear(
    pixelX: number,
    pixelY: number,
    heights: Float32Array,
    width: number,
    height: number,
    params: GfxHeightmapParams
  ): number {
    // Индексы ближайших целочисленных узлов
    const x0 = Math.floor(pixelX);
    const y0 = Math.floor(pixelY);
    const x1 = Math.min(x0 + 1, width - 1);
    const y1 = Math.min(y0 + 1, height - 1);

    // Весовые коэффициенты для интерполяции
    const wx = pixelX - x0;
    const wy = pixelY - y0;

    // Доступ к значениям высот в узлах
    const idx = (xx: number, yy: number) => yy * width + xx;
    const h00 = heights[idx(x0, y0)];
    const h10 = heights[idx(x1, y0)];
    const h01 = heights[idx(x0, y1)];
    const h11 = heights[idx(x1, y1)];

    // Билинейная интерполяция
    const h0 = h00 * (1 - wx) + h10 * wx;
    const h1 = h01 * (1 - wx) + h11 * wx;
    const interpolated = h0 * (1 - wy) + h1 * wy;

    // Нормализация в диапазон [min..max]
    const min = params.min;
    const max = params.max;
    return min + (max - min) * interpolated; // предполагаем, что heights уже [0..1]
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

  /**
   * Построить пространственный индекс для быстрого поиска операций террейна
   * Разбивает все операции по ячейкам сетки для оптимизированного поиска
   */
  private buildSpatialIndex(): void {
    if (!this.config.ops || this.config.ops.length === 0) {
      return;
    }

    this.spatialIndex = new Map();

    for (const op of this.config.ops) {
      // Определяем область влияния операции
      const maxRadius = Math.max(op.radius, op.radiusZ || op.radius);
      const minX = op.center[0] - maxRadius;
      const maxX = op.center[0] + maxRadius;
      const minZ = op.center[1] - maxRadius;
      const maxZ = op.center[1] + maxRadius;

      // Добавляем операцию во все затрагиваемые ячейки индекса
      const startCellX = Math.floor(minX / this.spatialCellSize);
      const endCellX = Math.floor(maxX / this.spatialCellSize);
      const startCellZ = Math.floor(minZ / this.spatialCellSize);
      const endCellZ = Math.floor(maxZ / this.spatialCellSize);

      for (let cellX = startCellX; cellX <= endCellX; cellX++) {
        for (let cellZ = startCellZ; cellZ <= endCellZ; cellZ++) {
          const cellKey = `${cellX},${cellZ}`;
          if (!this.spatialIndex.has(cellKey)) {
            this.spatialIndex.set(cellKey, []);
          }
          this.spatialIndex.get(cellKey)!.push(op);
        }
      }
    }
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
  private getRelevantOps(x: number, z: number): GfxTerrainOp[] {
    if (!this.spatialIndex) {
      return this.config.ops || [];
    }

    const cellX = Math.floor(x / this.spatialCellSize);
    const cellZ = Math.floor(z / this.spatialCellSize);
    const cellKey = `${cellX},${cellZ}`;

    return this.spatialIndex.get(cellKey) || [];
  }

  /**
   * Оптимизированное применение операций террейна с использованием пространственного индекса
   * @param baseHeight - базовая высота из источника
   * @param x - координата X в мировых координатах
   * @param z - координата Z в мировых координатах
   * @returns модифицированная высота после применения всех операций
   */
  private applyTerrainOpsOptimized(baseHeight: number, x: number, z: number): number {
    let height = baseHeight;
    const relevantOps = this.getRelevantOps(x, z);

    for (const op of relevantOps) {
      const contribution = this.calculateOpContribution(op, x, z);
      
      // Пропускаем операции с нулевым вкладом (оптимизация)
      if (contribution === 0) {
        continue;
      }
      
      switch (op.mode) {
        case 'add':
          height += contribution;
          break;
        case 'sub':
          height -= contribution;
          break;
        case 'set':
          height = baseHeight + contribution;
          break;
      }
    }

    return height;
  }

  /**
   * Применить массив операций модификации террейна к базовой высоте
   * @param baseHeight - базовая высота из источника
   * @param x - координата X в мировых координатах
   * @param z - координата Z в мировых координатах
   * @returns модифицированная высота после применения всех операций
   * @deprecated Используйте applyTerrainOpsOptimized для лучшей производительности
   */
  private applyTerrainOps(baseHeight: number, x: number, z: number): number {
    let height = baseHeight;

    for (const op of this.config.ops!) {
      const contribution = this.calculateOpContribution(op, x, z);
      
      switch (op.mode) {
        case 'add':
          height += contribution;
          break;
        case 'sub':
          height -= contribution;
          break;
        case 'set':
          height = baseHeight + contribution;
          break;
      }
    }

    return height;
  }

  /**
   * Вычислить вклад одной операции модификации террейна в точке
   * @param op - операция модификации террейна
   * @param x - координата X в мировых координатах
   * @param z - координата Z в мировых координатах
   * @returns значение вклада операции (может быть 0 если точка вне радиуса влияния)
   */
  private calculateOpContribution(op: GfxTerrainOp, x: number, z: number): number {
    // 1. Вычисляем расстояние от центра операции с учетом эллипса и поворота
    const distance = this.calculateOpDistance(op, x, z);
    
    // 2. Если расстояние больше 1, точка вне зоны влияния
    if (distance >= 1) {
      return 0;
    }
    
    // 3. Применяем функцию затухания
    const falloffValue = this.applyFalloffFunction(distance, op.falloff || 'smoothstep');
    
    // 4. Масштабируем на интенсивность операции
    return op.intensity * falloffValue;
  }

  /**
   * Вычислить нормализованное расстояние от центра операции с учетом эллипса и поворота
   * @param op - операция модификации террейна
   * @param x - координата X в мировых координатах  
   * @param z - координата Z в мировых координатах
   * @returns нормализованное расстояние (0 в центре, 1+ за пределами влияния)
   */
  private calculateOpDistance(op: GfxTerrainOp, x: number, z: number): number {
    // Относительные координаты от центра операции
    let dx = x - op.center[0];
    let dz = z - op.center[1];

    // Если есть поворот, применяем его
    if (op.rotation && op.rotation !== 0) {
      const cos = Math.cos(-op.rotation);
      const sin = Math.sin(-op.rotation);
      const rotatedDx = dx * cos - dz * sin;
      const rotatedDz = dx * sin + dz * cos;
      dx = rotatedDx;
      dz = rotatedDz;
    }

    // Радиусы для эллипса (если radiusZ не указан, используем сферу)
    const rx = op.radius;
    const rz = op.radiusZ || op.radius;

    // Нормализуем координаты относительно радиусов эллипса
    const normalizedDx = dx / rx;
    const normalizedDz = dz / rz;

    // Эллиптическое расстояние
    return Math.sqrt(normalizedDx * normalizedDx + normalizedDz * normalizedDz);
  }

  /**
   * Применить функцию затухания к нормализованному расстоянию
   * @param t - нормализованное расстояние от центра операции (0..1+)
   * @param falloff - тип функции затухания
   * @returns значение затухания (1 в центре, 0+ на краях и за пределами)
   */
  private applyFalloffFunction(t: number, falloff: 'smoothstep' | 'gauss' | 'linear'): number {
    // Ограничиваем t в диапазоне [0, 1]
    if (t >= 1) return 0;
    
    const normalizedT = Math.max(0, Math.min(1, 1 - t));

    switch (falloff) {
      case 'linear':
        return normalizedT;
      
      case 'smoothstep':
        // Классическая smoothstep функция для плавного перехода
        return normalizedT * normalizedT * (3 - 2 * normalizedT);
      
      case 'gauss':
        // Гауссово затухание с экспоненциальным спадом
        // Используем формулу exp(-3 * t^2) для резкого спада к краям
        const gaussT = 1 - normalizedT; // инвертируем для правильного направления
        return Math.exp(-3 * gaussT * gaussT);
      
      default:
        console.warn(`Unknown falloff type: ${falloff}, using smoothstep`);
        return normalizedT * normalizedT * (3 - 2 * normalizedT);
    }
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

/**
 * Создать THREE.js геометрию для террейна на основе GfxHeightSampler
 * @param cfg - конфигурация террейна
 * @param sampler - сэмплер высот для получения данных о рельефе
 * @returns THREE.BufferGeometry с вершинами, соответствующими террейну
 */
export function buildGfxTerrainGeometry(cfg: GfxTerrainConfig, sampler: GfxHeightSampler): THREE.BufferGeometry {
  // Определяем количество сегментов на основе размеров террейна
  const segments = decideSegments(cfg.worldWidth, cfg.worldHeight);
  
  // Создаем плоскую геометрию
  const geom = new THREE.PlaneGeometry(cfg.worldWidth, cfg.worldHeight, segments, segments);
  geom.rotateX(-Math.PI / 2); // поворачиваем горизонтально
  
  const positionArray = geom.attributes.position.array as Float32Array;
  
  // Применяем высоты из sampler к каждой вершине
  for (let i = 0; i < positionArray.length; i += 3) {
    const x = positionArray[i];
    const z = positionArray[i + 2];
    positionArray[i + 1] = sampler.getHeight(x, z);
  }
  
  // Обновляем атрибуты геометрии
  geom.attributes.position.needsUpdate = true;
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  
  return geom;
}

/**
 * Определить оптимальное количество сегментов для геометрии террейна
 * Логика аналогична createPerlinGeometry для совместимости
 * @param worldWidth - ширина террейна в мировых координатах
 * @param worldHeight - высота террейна в мировых координатах
 * @returns количество сегментов (10-200)
 */
function decideSegments(worldWidth: number, worldHeight: number): number {
  const maxDimension = Math.max(worldWidth, worldHeight);
  return maxDimension > TERRAIN_MAX_SEGMENTS ? TERRAIN_MAX_SEGMENTS : Math.max(10, Math.floor(maxDimension));
}
