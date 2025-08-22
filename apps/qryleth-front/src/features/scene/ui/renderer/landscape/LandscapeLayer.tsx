import React, { useMemo, useState } from 'react'
import * as THREE from 'three'
import type { SceneLayer } from '@/entities/scene/types.ts'
import { useSceneStore } from '@/features/scene/model/sceneStore.ts'
import { createPerlinGeometry } from '@/features/scene/lib/geometry/perlinGeometry.ts'
import { DEFAULT_LANDSCAPE_COLOR } from '@/features/scene/constants.ts'
import { GfxLayerType, GfxLayerShape } from '@/entities/layer'
import type { GfxTerrainConfig } from '@/entities/terrain'
import { createGfxHeightSampler, buildGfxTerrainGeometry } from '@/features/scene/lib/terrain/GfxHeightSampler.ts'

export interface LandscapeLayerProps {
  layer: SceneLayer
}

/**
 * Создать terrain конфигурацию из legacy данных слоя для обратной совместимости
 * @param layer - слой сцены с legacy данными
 * @returns конфигурация террейна для GfxHeightSampler
 */
const createLegacyTerrainConfig = (layer: SceneLayer): GfxTerrainConfig | null => {
  if (layer.shape === GfxLayerShape.Terrain && layer.noiseData) {
    return {
      worldWidth: layer.width || 1,
      worldHeight: layer.height || 1,
      edgeFade: 0.15, // такое же значение, как в createPerlinGeometry
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

/**
 * Компонент отрисовки ландшафтного слоя.
 * Принимает слой сцены и создаёт соответствующую геометрию и материал.
 * Поддерживает новую архитектуру GfxHeightSampler и legacy режим для совместимости.
 * Цвет материала берётся из свойства `color` слоя, вне зависимости от его формы.
 */
export const LandscapeLayer: React.FC<LandscapeLayerProps> = ({ layer }) => {
  const updateLayer = useSceneStore(state => state.updateLayer)

  // Состояние для принудительного обновления геометрии после загрузки heightmap
  const [heightmapLoaded, setHeightmapLoaded] = useState(false)

  const geometry = useMemo(() => {
    if (layer.shape === GfxLayerShape.Terrain) {
      // Новая архитектура: используем GfxHeightSampler если есть terrain конфигурация
      if (layer.terrain) {
        console.log('🗻 LandscapeLayer: Using terrain config for layer', layer.id, layer.terrain)
        const sampler = createGfxHeightSampler(layer.terrain)
        
        // Для heightmap источников: подписываемся на событие загрузки данных
        if (layer.terrain.source.kind === 'heightmap') {
          // Используем типизированный метод интерфейса (опциональный)
          sampler.onHeightmapLoaded?.(() => {
            console.log('🗻 Heightmap data loaded, triggering geometry rebuild')
            // Локально триггерим пересоздание меша/геометрии
            setHeightmapLoaded(prev => !prev)
            // И дополнительно обновляем слой в сторе теми же данными, чтобы
            // гарантированно разрушить мемоизацию по ссылке terrain и пересобрать потомков
            if (layer.terrain) {
              updateLayer(layer.id, { terrain: { ...layer.terrain } })
            }
          })
        }
        
        const geometry = buildGfxTerrainGeometry(layer.terrain, sampler)
        console.log('🗻 LandscapeLayer: Generated geometry with vertices:', geometry.attributes.position.count)
        return geometry
      }
      
      // Legacy режим: создаем terrain конфигурацию из noiseData
      const legacyConfig = createLegacyTerrainConfig(layer)
      if (legacyConfig) {
        const sampler = createGfxHeightSampler(legacyConfig)
        return buildGfxTerrainGeometry(legacyConfig, sampler)
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
      const sampler = createGfxHeightSampler(newTerrainConfig)
      return buildGfxTerrainGeometry(newTerrainConfig, sampler)
    } else {
      return new THREE.PlaneGeometry(layer.width || 1, layer.height || 1)
    }
  }, [layer.width, layer.height, layer.shape, layer.noiseData, layer.terrain, layer.id, updateLayer, heightmapLoaded])

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
      // Ключ зависит от heightmapLoaded чтобы гарантированно пересоздать Mesh после загрузки
      key={`${layer.id}-${heightmapLoaded ? 'hm1' : 'hm0'}`}
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
