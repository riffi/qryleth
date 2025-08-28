import React, { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Detailed } from '@react-three/drei'
import type { SceneLayer } from '@/entities/scene/types.ts'
import { useSceneStore } from '@/features/scene/model/sceneStore.ts'
import { DEFAULT_LANDSCAPE_COLOR } from '@/features/scene/constants.ts'
import { GfxLayerType, GfxLayerShape } from '@/entities/layer'
import type { GfxTerrainConfig } from '@/entities/terrain'
import { createGfxHeightSampler } from '@/features/scene/lib/terrain/GfxHeightSampler.ts'
import { buildGfxTerrainGeometry } from '@/features/scene/lib/terrain/GeometryBuilder.ts'
import { MultiColorProcessor } from '@/features/scene/lib/terrain/MultiColorProcessor.ts'

export interface LandscapeLayerProps {
  layer: SceneLayer
  lodDistances?: [number, number, number]
  lodSampleSteps?: [number, number, number]
}

export const LandscapeLayer: React.FC<LandscapeLayerProps> = ({
                                                                layer,
                                                                lodDistances = [50, 100, 300],
                                                                lodSampleSteps = [1, 2, 8],
                                                              }) => {
  const startTerrainApplying = useSceneStore((s) => s.startTerrainApplying)
  const finishTerrainApplying = useSceneStore((s) => s.finishTerrainApplying)
  const DEBUG = (import.meta as any)?.env?.MODE !== 'production'

  const [geometryVersion, setGeometryVersion] = useState(0)

  const sampler = useMemo(() => {
    if (layer.shape === GfxLayerShape.Terrain && layer.terrain) {
      if (DEBUG)
        console.log('🗻 LandscapeLayer: Using terrain config for layer', layer.id, layer.terrain)
      return createGfxHeightSampler(layer.terrain)
    }
    return null
  }, [layer.id, layer.shape, layer.terrain])

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
        setGeometryVersion((v) => v + 1)
      } finally {
        if (needsWait) finishTerrainApplying()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sampler, layer.shape, layer.terrain, startTerrainApplying, finishTerrainApplying])

  const buildTerrainWithStep = (
      terrain: GfxTerrainConfig,
      sampler: any,
      sampleStep: number,
  ): THREE.BufferGeometry => {
    try {
      return (buildGfxTerrainGeometry as any)(terrain, sampler, sampleStep )
    } catch (e) {
      if (DEBUG)
        console.warn('⚠️ buildGfxTerrainGeometry без поддержки sampleStep', e)
      return (buildGfxTerrainGeometry as any)(terrain, sampler)
    }
  }

  const lodGeometries = useMemo(() => {
    const out: (THREE.BufferGeometry | null)[] = [null, null, null]
    if (layer.shape === GfxLayerShape.Terrain && layer.terrain && sampler) {
      out[0] = buildTerrainWithStep(layer.terrain, sampler, lodSampleSteps[0])
      out[1] = buildTerrainWithStep(layer.terrain, sampler, lodSampleSteps[1])
      out[2] = buildTerrainWithStep(layer.terrain, sampler, lodSampleSteps[2])
      if (DEBUG) {
        console.log(
            '🗻 LOD geometries counts:',
            out.map((g) => g?.attributes.position.count),
        )
      }
    } else {
      const w = layer.width || 1
      const d = (layer as any).depth ?? (layer as any).height ?? 1
      out[0] = new THREE.PlaneGeometry(w, d)
      out[1] = out[0]
      out[2] = out[0]
    }
    return out
  }, [layer.shape, layer.terrain, sampler, geometryVersion, layer.width, (layer as any).depth, (layer as any).height, lodSampleSteps])

  useEffect(() => {
    return () => {
      const uniq = Array.from(new Set(lodGeometries.filter(Boolean))) as THREE.BufferGeometry[]
      uniq.forEach((g) => g.dispose())
    }
  }, [lodGeometries])

  const multiColorProcessor = useMemo(() => {
    if (layer.multiColor && sampler) {
      if (DEBUG) console.log('🎨 LandscapeLayer: Creating MultiColorProcessor for layer', layer.id)
      return new MultiColorProcessor(layer.multiColor)
    }
    return null
  }, [layer.multiColor, sampler])

  useEffect(() => {
    if (!multiColorProcessor || !sampler) return
    lodGeometries.forEach((geometry) => {
      if (!geometry) return
      const colors = multiColorProcessor.generateVertexColors(sampler, geometry)
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      geometry.attributes.color.needsUpdate = true
    })
    if (DEBUG) console.log('🎨 Applied vertex colors to all LOD geometries')
  }, [multiColorProcessor, sampler, lodGeometries])

  const materialColor = useMemo(() => {
    if (layer.multiColor) return new THREE.Color('#ffffff')
    if (layer.color) return new THREE.Color(layer.color)
    if (layer.shape === GfxLayerShape.Terrain) return new THREE.Color('#4a7c59')
    return new THREE.Color(DEFAULT_LANDSCAPE_COLOR)
  }, [layer.shape, layer.color, layer.multiColor])

  const rotation = useMemo(() => {
    if (layer.shape === GfxLayerShape.Terrain) return [0, 0, 0] as const
    return [-Math.PI / 2, 0, 0] as const
  }, [layer.shape])

  const commonMaterialProps: JSX.IntrinsicElements['meshLambertMaterial'] = {
    color: materialColor,
    side: THREE.DoubleSide,
    wireframe: false,
    transparent: false,
    opacity: 1.0,
    vertexColors: !!layer.multiColor,
    flatShading: true,
  }

  const isTerrainWithLod =
      layer.shape === GfxLayerShape.Terrain && !!lodGeometries[0] && !!lodGeometries[1] && !!lodGeometries[2]

  if (isTerrainWithLod) {
    return (
        <Detailed
            distances={lodDistances}
            visible={layer.visible}
            rotation={rotation as any}
            position={[0, 0.1, 0]}
            userData={{ generated: true, layerId: layer.id, layerType: GfxLayerType.Landscape }}
        >
          <mesh geometry={lodGeometries[0]!} receiveShadow>
            <meshLambertMaterial {...commonMaterialProps} />
          </mesh>
          <mesh geometry={lodGeometries[1]!} receiveShadow>
            <meshLambertMaterial {...commonMaterialProps} />
          </mesh>
          <mesh geometry={lodGeometries[2]!} receiveShadow>
            <meshLambertMaterial {...commonMaterialProps} />
          </mesh>
        </Detailed>
    )
  }

  return (
      <mesh
          geometry={lodGeometries[0] || undefined}
          visible={layer.visible}
          rotation={rotation as any}
          position={[0, 0.1, 0]}
          receiveShadow
          userData={{ generated: true, layerId: layer.id, layerType: GfxLayerType.Landscape }}
      >
        <meshLambertMaterial {...commonMaterialProps} />
      </mesh>
  )
}
