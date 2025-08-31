import React from 'react'
import {SceneObjectRenderer, type SceneObjectRendererProps} from '../objects/SceneObjectRenderer.tsx'
import {LandscapeLayer, type LandscapeLayerProps} from '../landscape/LandscapeLayer.tsx'
import {WaterLayer, type WaterLayerProps} from '../landscape/WaterLayer.tsx'

// Memoized SceneObject for better performance with primitive groups support
export const MemoizedSceneObject = React.memo<SceneObjectRendererProps>(
  SceneObjectRenderer,
  (prevProps, nextProps) => {
    // Basic property comparison
    if (
      prevProps.instance !== nextProps.instance ||
      prevProps.instanceIndex !== nextProps.instanceIndex ||
      prevProps.isSelected !== nextProps.isSelected ||
      prevProps.isHovered !== nextProps.isHovered ||
      prevProps.renderMode !== nextProps.renderMode ||
      prevProps.visible !== nextProps.visible
    ) {
      return false
    }

    // Deep comparison for sceneObject properties that affect rendering
    const prev = prevProps.sceneObject
    const next = nextProps.sceneObject

    // Basic object properties
    if (
      prev.uuid !== next.uuid ||
      prev.name !== next.name ||
      prev.layerId !== next.layerId ||
      prev.visible !== next.visible
    ) {
      return false
    }

    // Primitives comparison
    if (prev.primitives !== next.primitives) {
      return false
    }

    // Materials comparison
    if (prev.materials !== next.materials) {
      return false
    }

    // Primitive groups comparison
    if (prev.primitiveGroups !== next.primitiveGroups) {
      return false
    }

    // Primitive group assignments comparison
    if (prev.primitiveGroupAssignments !== next.primitiveGroupAssignments) {
      return false
    }

    return true
  }
)

// Memoized LandscapeLayer for better performance
/**
 * Мемоизированный компонент ландшафтного слоя.
 * Использует кастомную функцию сравнения пропсов для снижения количества перерисовок.
 *
 * ВАЖНО: сюда добавлено сравнение `layer.color`, чтобы изменение цвета слоя
 * (в том числе для слоёв с heightmap) приводило к повторному рендеру и
 * обновлению материала в сцене. Ранее цвет не учитывался и UI не обновлялся,
 * хоть значение корректно сохранялось в Dexie.
 */
export const MemoizedLandscapeLayer = React.memo<LandscapeLayerProps>(
  LandscapeLayer,
  (prevProps, nextProps) => {
    // Custom comparison function for landscape layers
    return (
      prevProps.layer.id === nextProps.layer.id &&
      prevProps.layer.visible === nextProps.layer.visible &&
      prevProps.layer.width === nextProps.layer.width &&
      ((prevProps.layer as any).depth ?? (prevProps.layer as any).height) === ((nextProps.layer as any).depth ?? (nextProps.layer as any).height) &&
      prevProps.layer.shape === nextProps.layer.shape &&
      prevProps.layer.color === nextProps.layer.color && // учитывать изменение цвета слоя
      // Важно: учитывать изменения конфигурации террейна (в т.ч. heightmap)
      prevProps.layer.terrain === nextProps.layer.terrain
    )
  }
)

// Memoized WaterLayer for better performance
export const MemoizedWaterLayer = React.memo<WaterLayerProps>(
  WaterLayer,
  (prevProps, nextProps) => {
    // Custom comparison function for water layers
    const prevDepth = (prevProps.layer as any).depth ?? (prevProps.layer as any).height
    const nextDepth = (nextProps.layer as any).depth ?? (nextProps.layer as any).height
    const prevBrightness = (prevProps.layer as any).water?.brightness ?? 1.6
    const nextBrightness = (nextProps.layer as any).water?.brightness ?? 1.6
    return (
      prevProps.layer.id === nextProps.layer.id &&
      prevProps.layer.visible === nextProps.layer.visible &&
      prevProps.layer.width === nextProps.layer.width &&
      prevDepth === nextDepth &&
      // Важно: изменение яркости воды должно обновлять рендер
      prevBrightness === nextBrightness
    )
  }
)

MemoizedSceneObject.displayName = 'MemoizedSceneObject'
MemoizedLandscapeLayer.displayName = 'MemoizedLandscapeLayer'
MemoizedWaterLayer.displayName = 'MemoizedWaterLayer'
