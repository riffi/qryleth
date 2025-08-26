import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { LandscapeLayer } from './LandscapeLayer'
import { GfxLayerType, GfxLayerShape } from '@/entities/layer'
import type { SceneLayer } from '@/entities/scene/types'

// Мокаем Zustand store-хук, чтобы перехватывать обращения без реального стора
vi.mock('@/features/scene/model/sceneStore.ts', () => {
  const updateLayer = vi.fn()
  const startTerrainApplying = vi.fn()
  const finishTerrainApplying = vi.fn()
  const fakeState = { updateLayer, startTerrainApplying, finishTerrainApplying }
  const useSceneStore = (selector: any) => selector(fakeState)
  // Экспортируем также функции для ассертов
  return { useSceneStore, __storeSpies: { updateLayer, startTerrainApplying, finishTerrainApplying } }
})

// Мокаем создание сэмплера, чтобы управлять готовностью для heightmap-кейса
vi.mock('@/features/scene/lib/terrain/GfxHeightSampler.ts', () => {
  return {
    createGfxHeightSampler: (cfg: any) => {
      if (cfg.source.kind === 'heightmap') {
        let resolved = false
        return {
          getHeight: () => 0,
          getNormal: () => [0, 1, 0],
          isReady: () => false,
          ready: async () => { if (!resolved) { resolved = true } },
          dispose: () => {}
        }
      }
      return {
        getHeight: () => 0,
        getNormal: () => [0, 1, 0],
        isReady: () => true,
        ready: async () => {},
        dispose: () => {}
      }
    }
  }
})

/**
 * Интеграционные тесты LandscapeLayer: отсутствие модификации стора на маунте
 * и управление прелоадером через ready() без таймеров.
 */
describe('LandscapeLayer (integration)', () => {
  afterEach(() => cleanup())

  it('не вызывает updateLayer на маунте (Perlin)', async () => {
    const { __storeSpies } = await import('@/features/scene/model/sceneStore.ts') as any
    const layer: SceneLayer = {
      id: 'l1',
      name: 'Terrain',
      type: GfxLayerType.Landscape,
      shape: GfxLayerShape.Terrain,
      visible: true,
      position: 0,
      width: 10,
      height: 10,
      terrain: {
        worldWidth: 10,
        worldHeight: 10,
        source: { kind: 'perlin', params: { seed: 1, octaveCount: 1, amplitude: 0, persistence: 0.5, width: 8, height: 8 } }
      }
    }
    render(<svg><LandscapeLayer layer={layer} /></svg>)
    expect(__storeSpies.updateLayer).not.toHaveBeenCalled()
  })

  it('управляет прелоадером через ready() (Heightmap): start→finish', async () => {
    const { __storeSpies } = await import('@/features/scene/model/sceneStore.ts') as any
    const layer: SceneLayer = {
      id: 'l2',
      name: 'Terrain HM',
      type: GfxLayerType.Landscape,
      shape: GfxLayerShape.Terrain,
      visible: true,
      position: 0,
      width: 10,
      height: 10,
      terrain: {
        worldWidth: 10,
        worldHeight: 10,
        source: { kind: 'heightmap', params: { assetId: 'a', imgWidth: 2, imgHeight: 2, min: 0, max: 1 } }
      }
    }
    render(<svg><LandscapeLayer layer={layer} /></svg>)
    // На старте isReady=false -> должен включиться прелоадер
    expect(__storeSpies.startTerrainApplying).toHaveBeenCalled()
    // После await ready() — должен выключиться прелоадер
    // (внутри эффекта компонента это делается в finally)
    await Promise.resolve()
    await Promise.resolve()
    expect(__storeSpies.finishTerrainApplying).toHaveBeenCalled()
  })
})

