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

  // Версия геометрии: увеличивается, когда sampler сообщает о готовности
  const [geometryVersion, setGeometryVersion] = useState(0)

  // Создаём sampler отдельно, чтобы можно было навесить onHeightmapLoaded в эффекте
  const sampler = useMemo(() => {
    if (layer.shape === GfxLayerShape.Terrain && layer.terrain) {
      if (DEBUG) console.log('🗻 LandscapeLayer: Using terrain config for layer', layer.id, layer.terrain)
      return createGfxHeightSampler(layer.terrain)
    }
    return null
  }, [layer.id, layer.shape, layer.terrain])

  // Ожидание готовности источника высот и управление прелоадером без таймеров
  useEffect(() => {
    if (!sampler || layer.shape !== GfxLayerShape.Terrain || !layer.terrain) return

    // Прелоадер показываем только для heightmap-источника и только когда есть ожидание
    const needsWait = layer.terrain.source.kind === 'heightmap' && !sampler.isReady?.()
    if (needsWait) startTerrainApplying()

    let cancelled = false
    ;(async () => {
      try {
        await sampler.ready?.()
        if (cancelled) return
        if (DEBUG) console.log('🗻 Terrain sampler ready — rebuilding geometry')
        setGeometryVersion(v => v + 1)
      } finally {
        if (needsWait) finishTerrainApplying()
      }
    })()

    return () => { cancelled = true }
  }, [sampler, layer.shape, layer.terrain, startTerrainApplying, finishTerrainApplying])

  const geometry = useMemo(() => {
    if (layer.shape === GfxLayerShape.Terrain) {
      // Новая архитектура: используем GfxHeightSampler если есть terrain конфигурация
      if (layer.terrain && sampler) {
        const geometry = buildGfxTerrainGeometry(layer.terrain, sampler)
        if (DEBUG) console.log('🗻 LandscapeLayer: Generated geometry with vertices:', geometry.attributes.position.count)
        return geometry
      }
      // Нет конфигурации террейна — возвращаем простую плоскость для безопасности
      return new THREE.PlaneGeometry(layer.width || 1, layer.height || 1)
    } else {
      return new THREE.PlaneGeometry(layer.width || 1, layer.height || 1)
    }
  }, [layer.width, layer.height, layer.shape, layer.terrain, layer.id, sampler, geometryVersion])

  // Освобождение геометрии при размонтировании/пересоздании
  useEffect(() => {
    return () => {
      geometry?.dispose()
    }
  }, [geometry])

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
