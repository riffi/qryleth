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
          // При смене типа воды важно форсировать перемонтирование, чтобы гарантированно сменился подлежащий компонент
          key={`${layer.id}-${((layer as any).water?.type || 'realistic')}`}
          layer={layer}
        />
      ))}
    </group>
  )
}
