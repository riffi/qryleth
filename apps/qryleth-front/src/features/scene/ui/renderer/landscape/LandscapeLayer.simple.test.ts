import { describe, it, expect } from 'vitest'
import { GfxLayerType, GfxLayerShape } from '@/entities/layer'
import type { SceneLayer } from '@/entities/scene/types'
import type { GfxTerrainConfig } from '@/entities/terrain'

/**
 * Простые тесты для проверки логики создания legacy terrain конфигураций
 * без зависимостей от React компонентов
 */

// Извлекаем логику создания legacy конфигураций для тестирования
const createLegacyTerrainConfig = (layer: SceneLayer): GfxTerrainConfig | null => {
  if (layer.shape === GfxLayerShape.Perlin && layer.noiseData) {
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

describe('LandscapeLayer Legacy Compatibility Logic', () => {
  it('создает legacy конфигурацию из noiseData', () => {
    const legacyLayer: SceneLayer = {
      id: 'legacy-layer',
      name: 'Legacy Perlin Layer',
      type: GfxLayerType.Landscape,
      shape: GfxLayerShape.Perlin,
      width: 10,
      height: 8,
      noiseData: [0.1, 0.2, 0.3, 0.4],
      visible: true
    }

    const config = createLegacyTerrainConfig(legacyLayer)
    
    expect(config).not.toBeNull()
    expect(config?.source.kind).toBe('legacy')
    expect(config?.worldWidth).toBe(10)
    expect(config?.worldHeight).toBe(8)
    expect(config?.edgeFade).toBe(0.15)
    
    if (config?.source.kind === 'legacy') {
      expect(config.source.data).toBeInstanceOf(Float32Array)
      expect(config.source.data.length).toBe(4)
      // Float32Array может иметь небольшие ошибки точности, поэтому проверяем приблизительные значения
      expect(Math.abs(config.source.data[0] - 0.1)).toBeLessThan(0.001)
      expect(Math.abs(config.source.data[1] - 0.2)).toBeLessThan(0.001)
      expect(Math.abs(config.source.data[2] - 0.3)).toBeLessThan(0.001)
      expect(Math.abs(config.source.data[3] - 0.4)).toBeLessThan(0.001)
    }
  })

  it('ограничивает размеры сегментов до 200', () => {
    const largeLayer: SceneLayer = {
      id: 'large-layer',
      name: 'Large Perlin Layer',
      type: GfxLayerType.Landscape,
      shape: GfxLayerShape.Perlin,
      width: 500,
      height: 300,
      noiseData: [1, 2, 3, 4],
      visible: true
    }

    const config = createLegacyTerrainConfig(largeLayer)
    
    expect(config?.worldWidth).toBe(500)
    expect(config?.worldHeight).toBe(300)
    
    if (config?.source.kind === 'legacy') {
      expect(config.source.width).toBe(200) // Ограничено до 200
      expect(config.source.height).toBe(200) // Ограничено до 200
    }
  })

  it('возвращает null для не-Perlin слоев', () => {
    const planeLayer: SceneLayer = {
      id: 'plane-layer',
      name: 'Plane Layer',
      type: GfxLayerType.Landscape,
      shape: GfxLayerShape.Plane,
      width: 10,
      height: 10,
      noiseData: [1, 2, 3, 4], // noiseData есть, но shape не Perlin
      visible: true
    }

    const config = createLegacyTerrainConfig(planeLayer)
    
    expect(config).toBeNull()
  })

  it('возвращает null для Perlin слоев без noiseData', () => {
    const emptyPerlinLayer: SceneLayer = {
      id: 'empty-perlin',
      name: 'Empty Perlin Layer',
      type: GfxLayerType.Landscape,
      shape: GfxLayerShape.Perlin,
      width: 10,
      height: 10,
      // noiseData отсутствует
      visible: true
    }

    const config = createLegacyTerrainConfig(emptyPerlinLayer)
    
    expect(config).toBeNull()
  })

  it('использует значения по умолчанию для размеров', () => {
    const layerWithoutSizes: SceneLayer = {
      id: 'no-sizes-layer',
      name: 'Layer Without Sizes',
      type: GfxLayerType.Landscape,
      shape: GfxLayerShape.Perlin,
      // width и height не заданы
      noiseData: [1, 2],
      visible: true
    }

    const config = createLegacyTerrainConfig(layerWithoutSizes)
    
    expect(config?.worldWidth).toBe(1)
    expect(config?.worldHeight).toBe(1)
    
    if (config?.source.kind === 'legacy') {
      expect(config.source.width).toBe(1)
      expect(config.source.height).toBe(1)
    }
  })
})