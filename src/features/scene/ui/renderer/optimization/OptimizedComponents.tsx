import React from 'react'
import {SceneObjectRenderer, type SceneObjectRendererProps} from '../objects/SceneObjectRenderer.tsx'
import {LandscapeLayer, type LandscapeLayerProps} from '../landscape/LandscapeLayer.tsx'
import {WaterLayer, type WaterLayerProps} from '../landscape/WaterLayer.tsx'

// Memoized  for better performance
export const MemoizedSceneObject = React.memo<SceneObjectRendererProps>(
  SceneObjectRenderer,
  (prevProps, nextProps) => {
    // Custom comparison function for optimal re-rendering
    return (
      prevProps.sceneObject === nextProps.sceneObject &&
      prevProps.instance === nextProps.instance &&
      prevProps.instanceIndex === nextProps.instanceIndex &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isHovered === nextProps.isHovered &&
      prevProps.renderMode === nextProps.renderMode &&
      prevProps.visible === nextProps.visible
    )
  }
)

// Memoized LandscapeLayer for better performance
export const MemoizedLandscapeLayer = React.memo<LandscapeLayerProps>(
  LandscapeLayer,
  (prevProps, nextProps) => {
    // Custom comparison function for landscape layers
    return (
      prevProps.layer.id === nextProps.layer.id &&
      prevProps.layer.visible === nextProps.layer.visible &&
      prevProps.layer.width === nextProps.layer.width &&
      prevProps.layer.height === nextProps.layer.height &&
      prevProps.layer.shape === nextProps.layer.shape &&
      prevProps.layer.noiseData === nextProps.layer.noiseData
    )
  }
)

// Memoized WaterLayer for better performance
export const MemoizedWaterLayer = React.memo<WaterLayerProps>(
  WaterLayer,
  (prevProps, nextProps) => {
    // Custom comparison function for water layers
    return (
      prevProps.layer.id === nextProps.layer.id &&
      prevProps.layer.visible === nextProps.layer.visible &&
      prevProps.layer.width === nextProps.layer.width &&
      prevProps.layer.height === nextProps.layer.height
    )
  }
)

MemoizedSceneObject.displayName = 'MemoizedSceneObject'
MemoizedLandscapeLayer.displayName = 'MemoizedLandscapeLayer'
MemoizedWaterLayer.displayName = 'MemoizedWaterLayer'
