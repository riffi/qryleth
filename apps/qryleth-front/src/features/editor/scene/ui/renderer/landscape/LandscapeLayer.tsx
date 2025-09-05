import React from 'react'
import type { SceneLayer } from '@/entities/scene/types.ts'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore.ts'
import { GfxLayerType } from '@/entities/layer'
import { LandscapeContentLayers } from './LandscapeContentLayers'

export interface LandscapeLayerProps {
  layer: SceneLayer
}

/**
 * Рендер ландшафтного слоя (новая архитектура).
 *
 * Компонент больше не строит геометрию из полей слоя. Вместо этого он выступает как «якорь» для
 * отображения содержимого контейнера landscapeContent, если тот привязан к данному слою (layer.id).
 * Внутри делегирует отрисовку площадок компоненту LandscapeContentLayers.
 */
export const LandscapeLayer: React.FC<LandscapeLayerProps> = ({ layer }) => {
  const content = useSceneStore(state => state.landscapeContent)
  if (!layer.visible) return null
  if (!content || content.layerId !== layer.id) return null

  return (
    <group userData={{ layerId: layer.id, layerType: GfxLayerType.Landscape }}>
      <LandscapeContentLayers />
    </group>
  )
}
