import React from 'react'
import {SceneObjectRenderer, type SceneObjectRendererProps} from '../objects/SceneObjectRenderer.tsx'
import {LandscapeLayer, type LandscapeLayerProps} from '../landscape/LandscapeLayer'

// Memoized CompositeObject for better performance
export const MemoizedCompositeObject = React.memo<SceneObjectRendererProps>(
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

MemoizedCompositeObject.displayName = 'MemoizedCompositeObject'
MemoizedLandscapeLayer.displayName = 'MemoizedLandscapeLayer'
