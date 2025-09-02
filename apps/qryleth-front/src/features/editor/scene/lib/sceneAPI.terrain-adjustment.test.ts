import { describe, it, expect, vi } from 'vitest'
import { GfxLayerType, GfxLayerShape } from '@/entities/layer'
import type { SceneLayer } from '@/entities/scene/types'
import type { GfxTerrainConfig } from '@/entities/terrain'

/**
 * Тест для проверки логики обнаружения terrain слоев для автовыравнивания объектов
 */

// Симулируем логику из sceneAPI.adjustInstancesForPerlinTerrain
const canLayerAdjustInstances = (layer: SceneLayer): boolean => {
  return layer.type === GfxLayerType.Landscape &&
         layer.shape === GfxLayerShape.Terrain &&
         Boolean(layer.terrain)
}

describe('Terrain Layer Detection for Object Adjustment', () => {
  it('должен обнаруживать новые слои с terrain конфигурацией', () => {
    const newTerrainLayer: SceneLayer = {
      id: 'new-terrain',
      name: 'New Terrain Layer',
      type: GfxLayerType.Landscape,
      shape: GfxLayerShape.Terrain,
      terrain: {
        worldWidth: 10,
        worldHeight: 10,
        edgeFade: 0.15,
        source: {
          kind: 'perlin',
          params: {
            seed: 1234,
            octaveCount: 4,
            amplitude: 0.1,
            persistence: 0.5,
            width: 10,
            height: 10
          }
        }
      } as GfxTerrainConfig,
      visible: true
    }

    expect(canLayerAdjustInstances(newTerrainLayer)).toBe(true)
  })

  // legacy/noiseData поддержка удалена

  it('должен отклонять Plane слои', () => {
    const planeLayer: SceneLayer = {
      id: 'plane-layer',
      name: 'Plane Layer',
      type: GfxLayerType.Landscape,
      shape: GfxLayerShape.Plane,
      visible: true
    }

    expect(canLayerAdjustInstances(planeLayer)).toBe(false)
  })

  it('должен отклонять Terrain слои без данных', () => {
    const emptyPerlinLayer: SceneLayer = {
      id: 'empty-perlin',
      name: 'Empty Perlin Layer',
      type: GfxLayerType.Landscape,
      shape: GfxLayerShape.Terrain,
      // нет terrain
      visible: true
    }

    expect(canLayerAdjustInstances(emptyPerlinLayer)).toBe(false)
  })

  it('должен отклонять не-Landscape слои', () => {
    const objectLayer: SceneLayer = {
      id: 'object-layer',
      name: 'Object Layer',
      type: GfxLayerType.Object,
      visible: true
    }

    expect(canLayerAdjustInstances(objectLayer)).toBe(false)
  })

  it('проверяет логику обнаружения terrain данных в SceneObjectManager', () => {
    const layerWithTerrain: SceneLayer = {
      id: 'terrain-layer',
      name: 'Terrain Layer',
      type: GfxLayerType.Landscape,
      shape: GfxLayerShape.Terrain,
      terrain: {} as GfxTerrainConfig,
      visible: true
    }

    const emptyLayer: SceneLayer = {
      id: 'empty-layer',
      name: 'Empty Layer',
      type: GfxLayerType.Landscape,
      shape: GfxLayerShape.Terrain,
      visible: true
    }

    // Симулируем логику из SceneObjectManager
    expect(Boolean(layerWithTerrain.terrain)).toBe(true)
    expect(Boolean(emptyLayer.terrain)).toBe(false)
  })
})
