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