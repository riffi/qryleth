import React from 'react'
import { useSceneLayers } from '../store/sceneStore'
import { MemoizedLandscapeLayer } from '../optimization/OptimizedComponents'

export const LandscapeLayers: React.FC = () => {
  const layers = useSceneLayers()

  const landscapeLayers = layers.filter(layer => layer.type === 'landscape')

  if (landscapeLayers.length === 0) return null

  console.log('Rendering landscape layers:', landscapeLayers.length)

  return (
    <group>
      {landscapeLayers.map(layer => {
        console.log('Rendering landscape layer:', layer.id, 'visible:', layer.visible, 'shape:', layer.shape)
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
