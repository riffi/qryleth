import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LandscapeLayer } from './LandscapeLayer'
import { GfxLayerType, GfxLayerShape } from '@/entities/layer'
import type { SceneLayer } from '@/entities/scene/types'

// Mock the store
vi.mock('@/features/scene/model/sceneStore.ts', () => ({
  useSceneStore: () => vi.fn()
}))

// Mock Three.js
vi.mock('three', () => ({
  PlaneGeometry: vi.fn(),
  Color: vi.fn(),
  DoubleSide: 2,
  Mesh: 'mesh',
  MeshLambertMaterial: 'meshLambertMaterial'
}))

// Mock terrain modules
vi.mock('@/features/scene/lib/terrain/GfxHeightSampler', () => ({
  createGfxHeightSampler: vi.fn().mockReturnValue({
    getHeight: vi.fn().mockReturnValue(0),
    getNormal: vi.fn().mockReturnValue([0, 1, 0])
  }),
  buildGfxTerrainGeometry: vi.fn().mockReturnValue({})
}))

vi.mock('@/features/scene/lib/geometry/perlinGeometry.ts', () => ({
  createPerlinGeometry: vi.fn().mockReturnValue({
    geometry: {},
    noiseData: [1, 2, 3, 4]
  })
}))

describe('LandscapeLayer Legacy Compatibility', () => {
  const mockUpdateLayer = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock useSceneStore to return our mock function
    const useSceneStore = await import('@/features/scene/model/sceneStore.ts')
    vi.mocked(useSceneStore.useSceneStore).mockReturnValue(mockUpdateLayer)
  })

  it('обрабатывает legacy слои с noiseData', () => {
    const legacyLayer: SceneLayer = {
      id: 'legacy-layer',
      name: 'Legacy Perlin Layer',
      type: GfxLayerType.Landscape,
      shape: GfxLayerShape.Perlin,
      width: 10,
      height: 10,
      noiseData: [0.1, 0.2, 0.3, 0.4], // legacy данные
      visible: true
    }

    render(<LandscapeLayer layer={legacyLayer} />)

    // Проверяем, что createGfxHeightSampler был вызван для legacy конфигурации
    const { createGfxHeightSampler } = require('@/features/scene/lib/terrain/GfxHeightSampler')
    expect(createGfxHeightSampler).toHaveBeenCalled()

    // Проверяем, что была создана legacy конфигурация с правильными параметрами
    const callArguments = createGfxHeightSampler.mock.calls[0][0]
    expect(callArguments.source.kind).toBe('legacy')
    expect(callArguments.worldWidth).toBe(10)
    expect(callArguments.worldHeight).toBe(10)
  })

  it('использует новую архитектуру для слоев с terrain конфигурацией', () => {
    const newLayer: SceneLayer = {
      id: 'new-layer',
      name: 'New Terrain Layer',
      type: GfxLayerType.Landscape,
      shape: GfxLayerShape.Perlin,
      width: 10,
      height: 10,
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
      },
      visible: true
    }

    render(<LandscapeLayer layer={newLayer} />)

    // Проверяем, что createGfxHeightSampler был вызван с terrain конфигурацией
    const { createGfxHeightSampler } = require('@/features/scene/lib/terrain/GfxHeightSampler')
    expect(createGfxHeightSampler).toHaveBeenCalledWith(newLayer.terrain)
  })

  it('создает новую terrain конфигурацию для слоев без данных', () => {
    const emptyLayer: SceneLayer = {
      id: 'empty-layer',
      name: 'Empty Perlin Layer',
      type: GfxLayerType.Landscape,
      shape: GfxLayerShape.Perlin,
      width: 15,
      height: 20,
      visible: true
    }

    render(<LandscapeLayer layer={emptyLayer} />)

    // Проверяем, что updateLayer был вызван для сохранения новой terrain конфигурации
    expect(mockUpdateLayer).toHaveBeenCalledWith('empty-layer', 
      expect.objectContaining({
        terrain: expect.objectContaining({
          worldWidth: 15,
          worldHeight: 20,
          source: expect.objectContaining({
            kind: 'perlin',
            params: expect.objectContaining({
              seed: 1234,
              octaveCount: 4,
              amplitude: 0.1,
              persistence: 0.5
            })
          })
        })
      })
    )

    // Проверяем, что createGfxHeightSampler был вызван с новой конфигурацией
    const { createGfxHeightSampler } = require('@/features/scene/lib/terrain/GfxHeightSampler')
    expect(createGfxHeightSampler).toHaveBeenCalled()
    const config = createGfxHeightSampler.mock.calls[0][0]
    expect(config.source.kind).toBe('perlin')
  })

  it('работает с обычными plane слоями', () => {
    const planeLayer: SceneLayer = {
      id: 'plane-layer',
      name: 'Plane Layer',
      type: GfxLayerType.Landscape,
      shape: GfxLayerShape.Plane,
      width: 10,
      height: 10,
      visible: true
    }

    render(<LandscapeLayer layer={planeLayer} />)

    // Для обычных plane слоев должна использоваться стандартная PlaneGeometry
    const THREE = require('three')
    expect(THREE.PlaneGeometry).toHaveBeenCalledWith(10, 10)
  })
})