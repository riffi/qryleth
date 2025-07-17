import React from 'react'
import { CompositeObject } from '../objects/CompositeObject'
import { LandscapeLayer } from '../landscape/LandscapeLayer'
import type { CompositeObjectProps, LandscapeLayerProps } from '../../../types/r3f'

// Memoized CompositeObject for better performance
export const MemoizedCompositeObject = React.memo<CompositeObjectProps>(
  CompositeObject,
  (prevProps, nextProps) => {
    // Custom comparison function for optimal re-rendering
    return (
      prevProps.sceneObject === nextProps.sceneObject &&
      prevProps.placement === nextProps.placement &&
      prevProps.placementIndex === nextProps.placementIndex &&
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