import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { SceneLayer } from '@/entities/scene/types.ts'
import { useSceneStore } from '@/features/scene/model/sceneStore.ts'
import { DEFAULT_LANDSCAPE_COLOR } from '@/features/scene/constants.ts'
import { GfxLayerType, GfxLayerShape } from '@/entities/layer'
import type { GfxTerrainConfig } from '@/entities/terrain'
import { createGfxHeightSampler } from '@/features/scene/lib/terrain/GfxHeightSampler.ts'
import { buildGfxTerrainGeometry } from '@/features/scene/lib/terrain/GeometryBuilder.ts'

export interface LandscapeLayerProps {
  layer: SceneLayer
}


/**
 * Компонент отрисовки ландшафтного слоя.
 * Принимает слой сцены и создаёт соответствующую геометрию и материал.
 * Поддерживает архитектуру GfxHeightSampler (legacy режим удалён).
 * Цвет материала берётся из свойства `color` слоя, вне зависимости от его формы.
 */
export const LandscapeLayer: React.FC<LandscapeLayerProps> = ({ layer }) => {
  const updateLayer = useSceneStore(state => state.updateLayer)
  const startTerrainApplying = useSceneStore(state => state.startTerrainApplying)
  const finishTerrainApplying = useSceneStore(state => state.finishTerrainApplying)
  const DEBUG = (import.meta as any)?.env?.MODE !== 'production'

  // Состояние для принудительного обновления геометрии после загрузки heightmap
  const [heightmapLoaded, setHeightmapLoaded] = useState(false)

  // Отслеживаем assetId, для которого уже запускали прелоадер (чтобы не дублировать)
  const startedForAssetRef = useRef<string | null>(null)

  // Создаём sampler отдельно, чтобы можно было навесить onHeightmapLoaded в эффекте
  const sampler = useMemo(() => {
    if (layer.shape === GfxLayerShape.Terrain && layer.terrain) {
      if (DEBUG) console.log('🗻 LandscapeLayer: Using terrain config for layer', layer.id, layer.terrain)
      return createGfxHeightSampler(layer.terrain)
    }
    return null
  }, [layer.id, layer.shape, layer.terrain])

  // Подписка на завершение загрузки данных heightmap и управление прелоадером
  useEffect(() => {
    if (!sampler || layer.shape !== GfxLayerShape.Terrain || !layer.terrain) return
    if (layer.terrain.source.kind !== 'heightmap') return

    const assetId = layer.terrain.source.params.assetId

    // Стартуем прелоадер один раз на assetId
    if (startedForAssetRef.current !== assetId) {
      startedForAssetRef.current = assetId
      startTerrainApplying()
    }

    // Таймаут-защита: гарантированно закрыть прелоадер, даже если событие не придёт
    const safetyTimer = setTimeout(() => {
      if (DEBUG) console.warn('⏳ Heightmap apply timeout reached — closing preloader safeguard')
      finishTerrainApplying()
    }, 10000)

    // Флаг, чтобы обработать загрузку единожды для текущего assetId
    let handled = false

    sampler.onHeightmapLoaded?.(() => {
      if (handled) return
      handled = true
      if (DEBUG) console.log('🗻 Heightmap data loaded, triggering geometry rebuild')
      // Триггерим пересоздание геометрии
      setHeightmapLoaded(prev => !prev)
      // Важное изменение: больше не дергаем updateLayer, чтобы не пересоздавать sampler
      // и не запускать эффект заново. Локального триггера через state достаточно.
      finishTerrainApplying()
      clearTimeout(safetyTimer)
    })

    return () => {
      clearTimeout(safetyTimer)
    }
  }, [sampler, layer.shape, layer.terrain, updateLayer, startTerrainApplying, finishTerrainApplying])

  const geometry = useMemo(() => {
    if (layer.shape === GfxLayerShape.Terrain) {
      // Новая архитектура: используем GfxHeightSampler если есть terrain конфигурация
      if (layer.terrain && sampler) {
        const geometry = buildGfxTerrainGeometry(layer.terrain, sampler)
        if (DEBUG) console.log('🗻 LandscapeLayer: Generated geometry with vertices:', geometry.attributes.position.count)
        return geometry
      }

      // Создание новой terrain конфигурации для слоев без данных
      const newTerrainConfig: GfxTerrainConfig = {
        worldWidth: layer.width || 1,
        worldHeight: layer.height || 1,
        edgeFade: 0.15,
        source: {
          kind: 'perlin',
          params: {
            seed: 1234,
            octaveCount: 4,
            amplitude: 0.1,
            persistence: 0.5,
            width: (layer.width && layer.width > 200) ? 200 : (layer.width || 1),
            height: (layer.height && layer.height > 200) ? 200 : (layer.height || 1)
          }
        }
      }
      
      // Сохраняем новую terrain конфигурацию в store
      updateLayer(layer.id, { terrain: newTerrainConfig })
      
      // Создаем геометрию с новой конфигурацией
      const newSampler = createGfxHeightSampler(newTerrainConfig)
      return buildGfxTerrainGeometry(newTerrainConfig, newSampler)
    } else {
      return new THREE.PlaneGeometry(layer.width || 1, layer.height || 1)
    }
  }, [layer.width, layer.height, layer.shape, layer.terrain, layer.id, sampler, updateLayer, heightmapLoaded])

  const materialColor = useMemo(() => {
    if (layer.color) {
      return new THREE.Color(layer.color)
    }
    if (layer.shape === GfxLayerShape.Terrain) {
      return new THREE.Color('#4a7c59')
    } else {
      return new THREE.Color(DEFAULT_LANDSCAPE_COLOR)
    }
  }, [layer.shape, layer.color])

  const rotation = useMemo(() => {
    if (layer.shape === GfxLayerShape.Terrain) {
      return [0, 0, 0] // Terrain geometries are already horizontal (rotated in buildGfxTerrainGeometry)
    } else {
      return [-Math.PI / 2, 0, 0] // Rotate plane to be horizontal
    }
  }, [layer.shape])

  return (
    <mesh
      // Ключ зависит от heightmapLoaded и цвета чтобы гарантированно пересоздать Mesh при изменениях
      key={`${layer.id}-${heightmapLoaded ? 'hm1' : 'hm0'}-${layer.color || 'default'}`}
      geometry={geometry}
      visible={layer.visible}
      rotation={rotation}
      position={[0, 0.1, 0]} // Slightly above grid for better visibility
      receiveShadow
      userData={{
        generated: true,
        layerId: layer.id,
        layerType: GfxLayerType.Landscape
      }}
    >
      <meshLambertMaterial
        color={materialColor}
        side={THREE.DoubleSide}
        wireframe={false}
        transparent={false}
        opacity={1.0}
      />
    </mesh>
  )
}
