import React, { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import { DEFAULT_LANDSCAPE_COLOR } from '@/features/editor/scene/constants'
import { createGfxHeightSampler } from '@/features/editor/scene/lib/terrain/GfxHeightSampler'
import { buildGfxTerrainGeometry } from '@/features/editor/scene/lib/terrain/GeometryBuilder'
import { MultiColorProcessor } from '@/features/editor/scene/lib/terrain/MultiColorProcessor'

/**
 * Рендер ландшафта (новая архитектура): читает элементы из `landscapeContent.items`
 * и отрисовывает каждую площадку независимо от слоёв.
 *
 * Поддерживаемые формы:
 * - shape = 'terrain': строится геометрия по GfxTerrainConfig и сэмплеру высот;
 * - shape = 'plane': рендерится простая плоскость заданного размера.
 *
 * Цвет/многоцветная окраска берутся из item.material (color | multiColor).
 */
export const LandscapeContentLayers: React.FC = () => {
  const content = useSceneStore(state => state.landscapeContent)
  const renderMode = useSceneStore(state => (state as any).renderMode)
  const items = content?.items ?? []
  if (!items.length) return null

  return (
    <group>
      {items.map(item => (
        <LandscapeItemMesh key={item.id} item={item} wireframe={renderMode === 'wireframe'} />
      ))}
    </group>
  )
}

interface LandscapeItemMeshProps {
  item: import('@/entities/terrain').GfxLandscape
  wireframe: boolean
}

/**
 * Меш одной ландшафтной площадки. Генерирует геометрию и материал по данным элемента.
 */
const LandscapeItemMesh: React.FC<LandscapeItemMeshProps> = ({ item, wireframe }) => {
  const [geometryVersion, setGeometryVersion] = useState(0)

  const sampler = useMemo(() => {
    if (item.shape === 'terrain' && item.terrain) {
      return createGfxHeightSampler(item.terrain)
    }
    return null
  }, [item.shape, item.terrain])

  // Ожидание готовности heightmap при наличии
  useEffect(() => {
    if (!sampler || item.shape !== 'terrain' || !item.terrain) return
    let cancelled = false
    ;(async () => {
      await sampler.ready?.()
      if (!cancelled) setGeometryVersion(v => v + 1)
    })()
    return () => { cancelled = true }
  }, [sampler, item.shape, item.terrain])

  const baseGeometry = useMemo(() => {
    const w = item.size?.width || 1
    const d = item.size?.depth || 1
    let geom: THREE.BufferGeometry
    if (item.shape === 'terrain') {
      if (item.terrain && sampler) {
        geom = buildGfxTerrainGeometry(item.terrain, sampler)
      } else {
        geom = new THREE.PlaneGeometry(w, d)
      }
    } else {
      geom = new THREE.PlaneGeometry(w, d)
    }
    return geom
  }, [item.shape, item.size?.width, item.size?.depth, item.terrain, sampler, geometryVersion])

  useEffect(() => () => { baseGeometry?.dispose() }, [baseGeometry])

  const multiColorProcessor = useMemo(() => {
    if (item.material?.multiColor && sampler) {
      return new MultiColorProcessor(item.material.multiColor)
    }
    return null
  }, [item.material?.multiColor, sampler])

  const finalGeometry = useMemo(() => {
    if (!multiColorProcessor || !sampler || !baseGeometry) return baseGeometry
    const mode = item.material?.multiColor?.mode
    if (mode === 'triangle') {
      const faceGeom = multiColorProcessor.generateFaceColoredGeometry(sampler, baseGeometry)
      return faceGeom
    } else {
      const vertexColors = multiColorProcessor.generateVertexColors(sampler, baseGeometry)
      baseGeometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 4))
      ;(baseGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true
      return baseGeometry
    }
  }, [multiColorProcessor, sampler, baseGeometry, item.material?.multiColor])

  useEffect(() => {
    if (finalGeometry && finalGeometry !== baseGeometry) {
      return () => { finalGeometry.dispose() }
    }
  }, [finalGeometry, baseGeometry])

  const materialColor = useMemo(() => {
    if (item.material?.multiColor) return new THREE.Color('#ffffff')
    if (item.material?.color) return new THREE.Color(item.material.color)
    return new THREE.Color(DEFAULT_LANDSCAPE_COLOR)
  }, [item.material?.color, item.material?.multiColor])

  const rotation = item.shape === 'terrain' ? [0, 0, 0] as const : [-Math.PI / 2, 0, 0] as const
  const position = useMemo(() => ([item.center?.[0] ?? 0, 0.1, item.center?.[1] ?? 0] as const), [item.center])
  const useVertexColors = Boolean(item.material?.multiColor)

  return (
    <mesh
      geometry={finalGeometry}
      rotation={rotation}
      position={position}
      receiveShadow
    >
      <meshLambertMaterial
        color={materialColor}
        side={THREE.DoubleSide}
        wireframe={wireframe}
        transparent={Boolean(item.material?.multiColor?.palette?.some(s => (s.alpha ?? 1) < 1)) || Boolean(item.material?.multiColor)}
        opacity={1.0}
        vertexColors={useVertexColors}
      />
    </mesh>
  )
}

