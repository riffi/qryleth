import React, { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import type { SceneLayer } from '@/entities/scene/types.ts'
import { createPerlinGeometry } from '@/shared/lib/perlinGeometry.ts'
import { useSceneStore } from '@/features/scene/model/sceneStore.ts'

export interface LandscapeLayerProps {
  layer: SceneLayer
}

export const LandscapeLayer: React.FC<LandscapeLayerProps> = ({ layer }) => {
  const updateLayer = useSceneStore(state => state.updateLayer)
  
  const geometry = useMemo(() => {
    if (layer.shape === 'perlin') {
      console.log('Creating perlin geometry for layer:', layer.id)
      const result = createPerlinGeometry(
        layer.width || 1,
        layer.height || 1,
        layer.noiseData
      )
      
      // Save noiseData to store if it wasn't already saved
      if (!layer.noiseData && result.noiseData) {
        console.log('Saving noiseData for layer:', layer.id)
        updateLayer(layer.id, { noiseData: result.noiseData })
      }
      
      return result.geometry
    } else {
      console.log('Creating plane geometry for layer:', layer.id)
      return new THREE.PlaneGeometry(layer.width || 1, layer.height || 1)
    }
  }, [layer.width, layer.height, layer.shape, layer.noiseData, layer.id, updateLayer])

  const materialColor = useMemo(() => {
    if (layer.shape === 'perlin') {
      return 0x4a7c59 // Realistic green for perlin landscapes
    } else {
      return 0x8B4513 // Brown for plane landscapes
    }
  }, [layer.shape])

  const rotation = useMemo(() => {
    if (layer.shape === 'perlin') {
      return [0, 0, 0] // Perlin landscapes are already horizontal
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
        layerType: 'landscape'
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
