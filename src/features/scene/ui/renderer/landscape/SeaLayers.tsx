import React from 'react'
import { useSceneLayers } from '@/features/scene'
import { MemoizedSeaLayer } from '@/features/scene'

export const SeaLayers: React.FC = () => {
  const layers = useSceneLayers()

  const seaLayers = layers.filter(layer => layer.type === 'sea')

  if (seaLayers.length === 0) return null

  return (
    <group>
      {seaLayers.map(layer => (
        <MemoizedSeaLayer
          key={layer.id}
          layer={layer}
        />
      ))}
    </group>
  )
}