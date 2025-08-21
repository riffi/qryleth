/**
 * Базовые тесты для GfxHeightSampler
 * Проверяют основную функциональность работы с различными источниками данных
 */

import { createGfxHeightSampler } from './GfxHeightSampler';
import type { GfxTerrainConfig } from '@/entities/terrain';

/**
 * Простая функция тестирования без зависимости от внешних библиотек
 * @param condition - условие для проверки
 * @param message - сообщение об ошибке
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Test failed: ${message}`);
  }
}

/**
 * Вспомогательная функция для проверки приближенного равенства чисел
 * @param actual - фактическое значение
 * @param expected - ожидаемое значение
 * @param tolerance - допустимая погрешность
 */
function assertApproxEqual(actual: number, expected: number, tolerance: number = 0.001): void {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(`Expected ${actual} to be approximately ${expected} (tolerance: ${tolerance}), but difference was ${diff}`);
  }
}

/**
 * Тест создания GfxHeightSampler с Perlin источником
 */
function testPerlinSource(): void {
  console.log('🧪 Testing Perlin source...');

  const config: GfxTerrainConfig = {
    worldWidth: 10,
    worldHeight: 10,
    source: {
      kind: 'perlin',
      params: {
        seed: 12345,
        octaveCount: 4,
        amplitude: 0.1,
        persistence: 0.5,
        width: 32,
        height: 32
      }
    }
  };

  const sampler = createGfxHeightSampler(config);
  
  // Проверяем, что можем получить высоту
  const height = sampler.getHeight(0, 0);
  assert(typeof height === 'number', 'Height should be a number');
  assert(isFinite(height), 'Height should be finite');
  
  // Проверяем детерминированность - одинаковые координаты должны давать одинаковую высоту
  const height2 = sampler.getHeight(0, 0);
  assert(height === height2, 'Same coordinates should return same height');
  
  // Проверяем нормали
  const normal = sampler.getNormal(0, 0);
  assert(Array.isArray(normal), 'Normal should be an array');
  assert(normal.length === 3, 'Normal should have 3 components');
  assert(normal.every(n => typeof n === 'number' && isFinite(n)), 'All normal components should be finite numbers');
  
  // Нормаль должна быть нормализована (длина ≈ 1)
  const normalLength = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
  assertApproxEqual(normalLength, 1, 0.01);
  
  console.log('✅ Perlin source test passed');
}

/**
 * Тест создания GfxHeightSampler с legacy источником
 */
function testLegacySource(): void {
  console.log('🧪 Testing Legacy source...');

  // Создаем простые тестовые данные
  const testData = new Float32Array([0, 1, 2, 3]);
  
  const config: GfxTerrainConfig = {
    worldWidth: 10,
    worldHeight: 10,
    source: {
      kind: 'legacy',
      data: testData,
      width: 2,
      height: 2
    }
  };

  const sampler = createGfxHeightSampler(config);
  
  // Проверяем, что можем получить высоту
  const height = sampler.getHeight(0, 0);
  assert(typeof height === 'number', 'Height should be a number');
  assert(isFinite(height), 'Height should be finite');
  
  // Проверяем нормали
  const normal = sampler.getNormal(0, 0);
  assert(Array.isArray(normal), 'Normal should be an array');
  assert(normal.length === 3, 'Normal should have 3 components');
  assert(normal.every(n => typeof n === 'number' && isFinite(n)), 'All normal components should be finite numbers');
  
  console.log('✅ Legacy source test passed');
}

/**
 * Тест обработки edgeFade
 */
function testEdgeFade(): void {
  console.log('🧪 Testing Edge fade...');

  const config: GfxTerrainConfig = {
    worldWidth: 10,
    worldHeight: 10,
    edgeFade: 0.2, // 20% области от края будет затухать
    source: {
      kind: 'perlin',
      params: {
        seed: 12345,
        octaveCount: 4,
        amplitude: 0.1,
        persistence: 0.5,
        width: 32,
        height: 32
      }
    }
  };

  const sampler = createGfxHeightSampler(config);
  
  // Получаем высоту в центре (не должна быть затухшей)
  const centerHeight = sampler.getHeight(0, 0);
  
  // Получаем высоту на краю (должна быть затухшей или нулевой)
  const edgeHeight = sampler.getHeight(-5, 0); // на левом краю
  
  // На краю высота должна быть меньше или равна центральной
  assert(edgeHeight <= centerHeight, 'Edge height should be <= center height with edgeFade');
  
  console.log('✅ Edge fade test passed');
}

/**
 * Тест обработки heightmap источника (заглушка)
 */
function testHeightmapSource(): void {
  console.log('🧪 Testing Heightmap source (stub)...');

  const config: GfxTerrainConfig = {
    worldWidth: 10,
    worldHeight: 10,
    source: {
      kind: 'heightmap',
      params: {
        assetId: 'test-asset-id',
        imgWidth: 256,
        imgHeight: 256,
        min: 0,
        max: 10
      }
    }
  };

  const sampler = createGfxHeightSampler(config);
  
  // Пока это заглушка, должна вернуть 0
  const height = sampler.getHeight(0, 0);
  assert(height === 0, 'Heightmap stub should return 0');
  
  // Нормаль должна указывать вверх
  const normal = sampler.getNormal(0, 0);
  assertApproxEqual(normal[0], 0);
  assertApproxEqual(normal[1], 1);  
  assertApproxEqual(normal[2], 0);
  
  console.log('✅ Heightmap source test passed (stub implementation)');
}

/**
 * Тест детерминированности seed-friendly генерации
 */
function testSeedDeterminism(): void {
  console.log('🧪 Testing Seed determinism...');

  const createConfig = (seed: number): GfxTerrainConfig => ({
    worldWidth: 10,
    worldHeight: 10,
    source: {
      kind: 'perlin',
      params: {
        seed: seed,
        octaveCount: 4,
        amplitude: 0.1,
        persistence: 0.5,
        width: 32,
        height: 32
      }
    }
  });

  const sampler1 = createGfxHeightSampler(createConfig(12345));
  const sampler2 = createGfxHeightSampler(createConfig(12345));
  const sampler3 = createGfxHeightSampler(createConfig(54321));
  
  // Сэмплеры с одинаковым seed должны давать одинаковые результаты
  const height1_1 = sampler1.getHeight(1, 2);
  const height1_2 = sampler2.getHeight(1, 2);
  assert(height1_1 === height1_2, 'Same seed should produce identical heights');
  
  // Сэмплеры с разным seed должны давать разные результаты
  const height2 = sampler3.getHeight(1, 2);
  assert(height1_1 !== height2, 'Different seeds should produce different heights');
  
  console.log('✅ Seed determinism test passed');
}

/**
 * Тест операций модификации террейна - режимы add, sub, set
 */
function testTerrainOpsBasic(): void {
  console.log('🧪 Testing TerrainOps basic modes...');

  const baseConfig: GfxTerrainConfig = {
    worldWidth: 10,
    worldHeight: 10,
    source: {
      kind: 'perlin',
      params: {
        seed: 12345,
        octaveCount: 1,
        amplitude: 0.1,
        persistence: 0.5,
        width: 32,
        height: 32
      }
    },
    ops: [
      {
        id: 'test-add',
        mode: 'add',
        center: [0, 0],
        radius: 2,
        intensity: 5,
        falloff: 'linear'
      }
    ]
  };

  const samplerWithOps = createGfxHeightSampler(baseConfig);
  
  // Создаем сэмплер без операций для сравнения
  const baseConfigNoOps = { ...baseConfig, ops: undefined };
  const samplerNoOps = createGfxHeightSampler(baseConfigNoOps);
  
  // В центре операции (0, 0) высота должна увеличиться на intensity
  const baseHeight = samplerNoOps.getHeight(0, 0);
  const modifiedHeight = samplerWithOps.getHeight(0, 0);
  
  // С linear falloff в центре должно быть базовая высота + intensity
  assertApproxEqual(modifiedHeight, baseHeight + 5, 0.1);
  
  // За пределами радиуса влияния высота должна остаться базовой
  const farHeight = samplerWithOps.getHeight(5, 5);
  const baseFarHeight = samplerNoOps.getHeight(5, 5);
  assertApproxEqual(farHeight, baseFarHeight, 0.001);
  
  console.log('✅ TerrainOps basic modes test passed');
}

/**
 * Тест функций затухания: linear, smoothstep, gauss
 */
function testTerrainOpsFalloffs(): void {
  console.log('🧪 Testing TerrainOps falloff functions...');

  const createConfigWithFalloff = (falloff: 'linear' | 'smoothstep' | 'gauss'): GfxTerrainConfig => ({
    worldWidth: 10,
    worldHeight: 10,
    source: {
      kind: 'legacy',
      data: new Float32Array([0, 0, 0, 0]), // плоская поверхность
      width: 2,
      height: 2
    },
    ops: [
      {
        id: 'test-falloff',
        mode: 'add',
        center: [0, 0],
        radius: 2,
        intensity: 10,
        falloff: falloff
      }
    ]
  });

  const linearSampler = createGfxHeightSampler(createConfigWithFalloff('linear'));
  const smoothstepSampler = createGfxHeightSampler(createConfigWithFalloff('smoothstep'));
  const gaussSampler = createGfxHeightSampler(createConfigWithFalloff('gauss'));
  
  // В центре все должны иметь максимальный эффект
  const centerLinear = linearSampler.getHeight(0, 0);
  const centerSmoothstep = smoothstepSampler.getHeight(0, 0);
  const centerGauss = gaussSampler.getHeight(0, 0);
  
  // Все должны быть близко к intensity (10) в центре
  assertApproxEqual(centerLinear, 10, 0.1);
  assertApproxEqual(centerSmoothstep, 10, 0.1);
  assertApproxEqual(centerGauss, 10, 0.1);
  
  // На половине радиуса различия должны быть видны
  const halfRadiusLinear = linearSampler.getHeight(1, 0);
  const halfRadiusSmoothstep = smoothstepSampler.getHeight(1, 0);
  const halfRadiusGauss = gaussSampler.getHeight(1, 0);
  
  // Linear должен быть 50% от максимума
  assertApproxEqual(halfRadiusLinear, 5, 0.5);
  
  // Smoothstep должен быть более плавным переходом
  assert(halfRadiusSmoothstep > 0 && halfRadiusSmoothstep < 10, 'Smoothstep should be between 0 and max');
  
  // Gauss должен спадать быстрее
  assert(halfRadiusGauss > 0 && halfRadiusGauss < 10, 'Gauss should be between 0 and max');
  
  console.log('✅ TerrainOps falloff functions test passed');
}

/**
 * Тест эллиптических операций с radiusZ и rotation
 */
function testTerrainOpsElliptical(): void {
  console.log('🧪 Testing TerrainOps elliptical operations...');

  const config: GfxTerrainConfig = {
    worldWidth: 10,
    worldHeight: 10,
    source: {
      kind: 'legacy',
      data: new Float32Array([0, 0, 0, 0]), // плоская поверхность
      width: 2,
      height: 2
    },
    ops: [
      {
        id: 'test-ellipse',
        mode: 'add',
        center: [0, 0],
        radius: 3,  // радиус по X
        radiusZ: 1, // радиус по Z (создает эллипс)
        intensity: 5,
        falloff: 'linear',
        rotation: Math.PI / 4  // поворот на 45 градусов
      }
    ]
  };

  const sampler = createGfxHeightSampler(config);
  
  // В центре должен быть полный эффект
  const centerHeight = sampler.getHeight(0, 0);
  assertApproxEqual(centerHeight, 5, 0.1);
  
  // Проверяем что эллиптическая форма работает
  // На расстоянии radius по X от центра (с учетом поворота) должно быть влияние
  // На большем расстоянии по Z (с учетом radiusZ) влияние должно быть меньше
  
  const heightAtX = sampler.getHeight(2, 0);
  const heightAtZ = sampler.getHeight(0, 2);
  
  // Из-за поворота и эллиптической формы значения могут отличаться от простых случаев
  // Главное что они не равны нулю и имеют правильный диапазон
  assert(heightAtX >= 0, 'Height at X should be non-negative');
  assert(heightAtZ >= 0, 'Height at Z should be non-negative');
  
  console.log('✅ TerrainOps elliptical operations test passed');
}

/**
 * Тест производительности пространственного индекса
 */
function testSpatialIndexPerformance(): void {
  console.log('🧪 Testing spatial index performance...');

  // Создаем много операций для тестирования пространственного индекса
  const manyOps: GfxTerrainConfig['ops'] = [];
  for (let i = 0; i < 100; i++) {
    manyOps.push({
      id: `op-${i}`,
      mode: 'add',
      center: [Math.random() * 100, Math.random() * 100],
      radius: 1 + Math.random() * 5,
      intensity: Math.random() * 10,
      falloff: 'linear'
    });
  }

  const config: GfxTerrainConfig = {
    worldWidth: 100,
    worldHeight: 100,
    source: {
      kind: 'legacy',
      data: new Float32Array([0, 0, 0, 0]),
      width: 2,
      height: 2
    },
    ops: manyOps
  };

  const sampler = createGfxHeightSampler(config);
  
  // Делаем много запросов высоты для проверки производительности
  const startTime = performance.now();
  
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * 100;
    const z = Math.random() * 100;
    const height = sampler.getHeight(x, z);
    assert(typeof height === 'number' && isFinite(height), 'Height should be finite number');
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(`⚡ Processed 1000 height queries with 100 ops in ${duration.toFixed(2)}ms`);
  
  // Проверяем что кэширование работает - повторные запросы должны быть быстрее
  const cacheStartTime = performance.now();
  
  for (let i = 0; i < 1000; i++) {
    // Повторяем те же координаты для использования кэша
    sampler.getHeight(50, 50);
  }
  
  const cacheEndTime = performance.now();
  const cacheDuration = cacheEndTime - cacheStartTime;
  
  console.log(`⚡ Processed 1000 cached queries in ${cacheDuration.toFixed(2)}ms`);
  
  // Кэшированные запросы должны быть значительно быстрее
  assert(cacheDuration < duration / 2, 'Cached queries should be much faster');
  
  console.log('✅ Spatial index performance test passed');
}

/**
 * Основная функция запуска всех тестов
 */
export function runGfxHeightSamplerTests(): void {
  console.log('🚀 Running GfxHeightSampler tests...\n');

  try {
    testPerlinSource();
    testLegacySource();
    testEdgeFade();
    testHeightmapSource();
    testSeedDeterminism();
    
    // Новые тесты для GfxTerrainOps (Фаза 3)
    testTerrainOpsBasic();
    testTerrainOpsFalloffs();
    testTerrainOpsElliptical();
    testSpatialIndexPerformance();
    
    console.log('\n✅ All GfxHeightSampler tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Запуск тестов при импорте модуля в режиме разработки
if (import.meta.env?.DEV) {
  // Можно раскомментировать для автоматического запуска тестов при разработке
  // runGfxHeightSamplerTests();
}