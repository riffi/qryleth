import React from 'react'
import { useSceneLayers } from '@/features/scene'
import { MemoizedWaterLayer } from '@/features/scene'
import { GfxLayerType } from '@/entities/layer'

/**
 * Контейнер для рендеринга всех водных слоев сцены.
 */
export const WaterLayers: React.FC = () => {
  const layers = useSceneLayers()

  const waterLayers = layers.filter(layer => layer.type === GfxLayerType.Water)

  if (waterLayers.length === 0) return null

  return (
    <group>
      {waterLayers.map(layer => (
        <MemoizedWaterLayer
          key={layer.id}
          layer={layer}
        />
      ))}
    </group>
  )
}
