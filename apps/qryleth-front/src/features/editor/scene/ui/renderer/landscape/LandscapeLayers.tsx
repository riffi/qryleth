import React from 'react'
import { useSceneLayers } from '@/features/editor/scene/model/sceneStore'
import { MemoizedLandscapeLayer } from '../optimization/OptimizedComponents'
import { GfxLayerType } from '@/entities/layer'

export const LandscapeLayers: React.FC = () => {
  const layers = useSceneLayers()

  const landscapeLayers = layers.filter(layer => layer.type === GfxLayerType.Landscape)

  if (landscapeLayers.length === 0) return null


  return (
    <group>
      {landscapeLayers.map(layer => {
        return (
          <MemoizedLandscapeLayer
            key={layer.id}
            layer={layer}
          />
        )
      })}
    </group>
  )
}
