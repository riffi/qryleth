import React, { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import type { SceneLayer } from '@/entities/scene/types.ts'
import { useSceneStore } from '@/features/scene/model/sceneStore.ts'
import { DEFAULT_LANDSCAPE_COLOR } from '@/features/scene/constants.ts'
import { GfxLayerType, GfxLayerShape } from '@/entities/layer'
import { createGfxHeightSampler } from '@/features/scene/lib/terrain/GfxHeightSampler.ts'
import { buildGfxTerrainGeometry } from '@/features/scene/lib/terrain/GeometryBuilder.ts'
import { MultiColorProcessor} from '@/features/scene/lib/terrain/MultiColorProcessor.ts'

export interface LandscapeLayerProps {
  layer: SceneLayer
}

/**
 * Рендер ландшафтного слоя с поддержкой:
 *  - покраски по вершинам (как было)
 *  - покраски по треугольникам (новое), если layer.multiColor.mode === 'triangle'
 */
export const LandscapeLayer: React.FC<LandscapeLayerProps> = ({ layer }) => {
  const startTerrainApplying = useSceneStore(state => state.startTerrainApplying)
  const finishTerrainApplying = useSceneStore(state => state.finishTerrainApplying)
  const DEBUG = (import.meta as any)?.env?.MODE !== 'production'

  const [geometryVersion, setGeometryVersion] = useState(0)

  // sampler
  const sampler = useMemo(() => {
    if (layer.shape === GfxLayerShape.Terrain && layer.terrain) {
      if (DEBUG) console.log('🗻 LandscapeLayer: Using terrain config for layer', layer.id, layer.terrain)
      return createGfxHeightSampler(layer.terrain)
    }
    return null
  }, [layer.id, layer.shape, layer.terrain])

  // ожидание готовности heightmap (если есть)
  useEffect(() => {
    if (!sampler || layer.shape !== GfxLayerShape.Terrain || !layer.terrain) return

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

  // базовая геометрия (индексированная, как строит билдер)
  const baseGeometry = useMemo(() => {
    const w = layer.width || 1
    const d = (layer as any).depth ?? (layer as any).height ?? 1

    let geom: THREE.BufferGeometry
    if (layer.shape === GfxLayerShape.Terrain) {
      if (layer.terrain && sampler) {
        geom = buildGfxTerrainGeometry(layer.terrain, sampler)
        if (DEBUG) console.log('🗻 LandscapeLayer: Generated geometry with vertices:', geom.attributes.position.count)
      } else {
        geom = new THREE.PlaneGeometry(w, d)
      }
    } else {
      geom = new THREE.PlaneGeometry(w, d)
      // плоскость повернём позже через rotation
    }
    return geom
  }, [layer.width, (layer as any).depth, (layer as any).height, layer.shape, layer.terrain, layer.id, sampler, geometryVersion])

  // освобождение базовой геометрии
  useEffect(() => () => { baseGeometry?.dispose() }, [baseGeometry])

  // процессор многоцветной окраски
  const multiColorProcessor = useMemo(() => {
    if (layer.multiColor && sampler) {
      if (DEBUG) console.log('🎨 LandscapeLayer: Creating MultiColorProcessor for layer', layer.id)
      // пробросим конфиг как есть — он совместим (mode/palette/slopeBoost)
      return new MultiColorProcessor(layer.multiColor)
    }
    return null
  }, [layer.multiColor, sampler])

  // итоговая геометрия под mesh:
  //  - если multiColor off -> используем baseGeometry
  //  - если multiColor.mode === 'triangle' -> создаём новую face-geometry
  //  - иначе -> красим вершины на месте
  const finalGeometry = useMemo(() => {
    if (!multiColorProcessor || !sampler || !baseGeometry) return baseGeometry

    const mode = (layer.multiColor as any)?.mode as ('vertex' | 'triangle' | undefined)

    if (mode === 'triangle') {
      const faceGeom = multiColorProcessor.generateFaceColoredGeometry(sampler, baseGeometry)
      if (DEBUG) console.log('🎨 LandscapeLayer: built face-colored geometry, vertices:', faceGeom.attributes.position.count)
      return faceGeom
    } else {
      const vertexColors = multiColorProcessor.generateVertexColors(sampler, baseGeometry)
      baseGeometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 4)) // RGBA вместо RGB
      ;(baseGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true
      return baseGeometry
    }
  }, [multiColorProcessor, sampler, baseGeometry, layer.multiColor, DEBUG])

  // освобождение face-геометрии (если создавали новую)
  useEffect(() => {
    // если finalGeometry !== baseGeometry — это новый объект, его нужно чистить
    if (finalGeometry && finalGeometry !== baseGeometry) {
      return () => { finalGeometry.dispose() }
    }
  }, [finalGeometry, baseGeometry])

  const materialColor = useMemo(() => {
    if (layer.multiColor) return new THREE.Color('#ffffff') // умножение на vertex colors
    if (layer.color) return new THREE.Color(layer.color)
    if (layer.shape === GfxLayerShape.Terrain) return new THREE.Color('#4a7c59')
    return new THREE.Color(DEFAULT_LANDSCAPE_COLOR)
  }, [layer.shape, layer.color, layer.multiColor])

  // Проверка наличия прозрачности в палитре
  const hasTransparency = useMemo(() => {
    if (!layer.multiColor?.palette) return false
    return layer.multiColor.palette.some(stop => (stop.alpha ?? 1.0) < 1.0)
  }, [layer.multiColor?.palette])

  const rotation = useMemo(() => {
    if (layer.shape === GfxLayerShape.Terrain) return [0, 0, 0] as const
    return [-Math.PI / 2, 0, 0] as const
  }, [layer.shape])

  const useVertexColors = Boolean(layer.multiColor)

  return (
      <mesh
          geometry={finalGeometry}
          visible={layer.visible}
          rotation={rotation}
          position={[0, 0.1, 0]}
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
            transparent={hasTransparency || layer.multiColor} // включаем прозрачность при наличии alpha в палитре
            opacity={1.0}
            vertexColors={useVertexColors}
        />
      </mesh>
  )
}
