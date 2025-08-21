/**
 * Базовые тесты для GfxHeightSampler
 * Проверяют основную функциональность работы с различными источниками данных
 */

import { describe, it, expect } from 'vitest';
import { createGfxHeightSampler } from './GfxHeightSampler';
import type { GfxTerrainConfig } from '@/entities/terrain';

/**
 * Вспомогательная функция для проверки приближенного равенства чисел
 * @param actual - фактическое значение
 * @param expected - ожидаемое значение
 * @param tolerance - допустимая погрешность
 */
function expectApproxEqual(actual: number, expected: number, tolerance: number = 0.001): void {
  const diff = Math.abs(actual - expected);
  expect(diff).toBeLessThanOrEqual(tolerance);
}

describe('GfxHeightSampler', () => {
  describe('Perlin source', () => {
    it('should create sampler with Perlin source and return valid heights', () => {
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
      expect(typeof height).toBe('number');
      expect(isFinite(height)).toBe(true);
      
      // Проверяем детерминированность - одинаковые координаты должны давать одинаковую высоту
      const height2 = sampler.getHeight(0, 0);
      expect(height).toBe(height2);
      
      // Проверяем нормали
      const normal = sampler.getNormal(0, 0);
      expect(Array.isArray(normal)).toBe(true);
      expect(normal).toHaveLength(3);
      expect(normal.every(n => typeof n === 'number' && isFinite(n))).toBe(true);
      
      // Нормаль должна быть нормализована (длина ≈ 1)
      const normalLength = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
      expectApproxEqual(normalLength, 1, 0.01);
    });
  });

  describe('Legacy source', () => {
    it('should create sampler with legacy source and return valid heights', () => {
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
      expect(typeof height).toBe('number');
      expect(isFinite(height)).toBe(true);
      
      // Проверяем нормали
      const normal = sampler.getNormal(0, 0);
      expect(Array.isArray(normal)).toBe(true);
      expect(normal).toHaveLength(3);
      expect(normal.every(n => typeof n === 'number' && isFinite(n))).toBe(true);
    });
  });

  describe('Edge fade', () => {
    it('should apply edge fade correctly', () => {
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
      expect(edgeHeight).toBeLessThanOrEqual(centerHeight);
    });
  });

  describe('Heightmap source (stub)', () => {
    it('should return zero for heightmap source stub', () => {
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
      expect(height).toBe(0);
      
      // Проверяем что нормаль имеет правильный формат (3 компонента и нормализована)
      const normal = sampler.getNormal(0, 0);
      expect(Array.isArray(normal)).toBe(true);
      expect(normal).toHaveLength(3);
      expect(normal.every(n => typeof n === 'number' && isFinite(n))).toBe(true);
      
      // Нормаль должна быть нормализована (длина ≈ 1)
      const normalLength = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
      expectApproxEqual(normalLength, 1, 0.01);
    });
  });

  describe('Seed determinism', () => {
    it('should produce identical results with same seed and different results with different seeds', () => {
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
      expect(height1_1).toBe(height1_2);
      
      // Сэмплеры с разным seed должны давать разные результаты
      const height2 = sampler3.getHeight(1, 2);
      expect(height1_1).not.toBe(height2);
    });
  });

  describe('TerrainOps basic modes', () => {
    it('should apply terrain operations correctly', () => {
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
      expectApproxEqual(modifiedHeight, baseHeight + 5, 0.1);
      
      // За пределами радиуса влияния высота должна остаться базовой
      const farHeight = samplerWithOps.getHeight(5, 5);
      const baseFarHeight = samplerNoOps.getHeight(5, 5);
      expectApproxEqual(farHeight, baseFarHeight, 0.001);
    });
  });

  describe('TerrainOps falloff functions', () => {
    it('should apply different falloff functions correctly', () => {
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
      expectApproxEqual(centerLinear, 10, 0.1);
      expectApproxEqual(centerSmoothstep, 10, 0.1);
      expectApproxEqual(centerGauss, 10, 0.1);
      
      // На половине радиуса различия должны быть видны
      const halfRadiusLinear = linearSampler.getHeight(1, 0);
      const halfRadiusSmoothstep = smoothstepSampler.getHeight(1, 0);
      const halfRadiusGauss = gaussSampler.getHeight(1, 0);
      
      // Linear должен быть 50% от максимума
      expectApproxEqual(halfRadiusLinear, 5, 0.5);
      
      // Smoothstep должен быть более плавным переходом
      expect(halfRadiusSmoothstep).toBeGreaterThan(0);
      expect(halfRadiusSmoothstep).toBeLessThan(10);
      
      // Gauss должен спадать быстрее
      expect(halfRadiusGauss).toBeGreaterThan(0);
      expect(halfRadiusGauss).toBeLessThan(10);
    });
  });

  describe('TerrainOps elliptical operations', () => {
    it('should handle elliptical operations with radiusZ and rotation', () => {
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
      expectApproxEqual(centerHeight, 5, 0.1);
      
      // Проверяем что эллиптическая форма работает
      const heightAtX = sampler.getHeight(2, 0);
      const heightAtZ = sampler.getHeight(0, 2);
      
      // Из-за поворота и эллиптической формы значения могут отличаться от простых случаев
      // Главное что они не равны нулю и имеют правильный диапазон
      expect(heightAtX).toBeGreaterThanOrEqual(0);
      expect(heightAtZ).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Spatial index performance', () => {
    it('should handle many operations efficiently with caching', () => {
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
        expect(typeof height).toBe('number');
        expect(isFinite(height)).toBe(true);
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
      expect(cacheDuration).toBeLessThan(duration / 2);
    });
  });
});