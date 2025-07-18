import React from 'react'
import { MemoizedCompositeObject } from '../../optimization/OptimizedComponents'
import { InstancedObjects, ConditionalInstancedObject } from '../../optimization/InstancedObjects'
import {
  useObjectObjects,
  useObjectPlacements,
  useObjectLayers,
  useObjectSelected,
  useObjectHovered,
  useObjectStore
} from '../../../../stores/objectStore'

export const ObjectSceneObjects: React.FC = () => {
  const objects = useObjectObjects()
  const placements = useObjectPlacements()
  const layers = useObjectLayers()
  const selectedObject = useObjectSelected()
  const hoveredObject = useObjectHovered()
  const updatePlacement = useObjectStore(state => state.updatePlacement)
  const clearSelection = useObjectStore(state => state.clearSelection)

  const isSelected = (objectIndex: number, instanceId?: string) => {
    if (!selectedObject) return false
    return selectedObject.objectIndex === objectIndex && selectedObject.instanceId === instanceId
  }

  const isHovered = (objectIndex: number, instanceId?: string) => {
    if (!hoveredObject) return false
    return hoveredObject.objectIndex === objectIndex && hoveredObject.instanceId === instanceId
  }

  const handleObjectTransform = (event: any) => {
    if (event.placementIndex !== undefined) {
      updatePlacement(event.placementIndex, {
        position: [event.position.x, event.position.y, event.position.z],
        rotation: [event.rotation.x, event.rotation.y, event.rotation.z],
        scale: [event.scale.x, event.scale.y, event.scale.z]
      })
    }
  }

  return (
    <group
      onPointerMissed={() => clearSelection()}
    >
      <InstancedObjects minimumInstancesForOptimization={3} />
      {placements.map((placement, placementIndex) => {
        const sceneObject = objects[placement.objectIndex]
        if (!sceneObject) return null
        const layerId = sceneObject.layerId || 'objects'
        const layer = layers.find(l => l.id === layerId)
        const isLayerVisible = layer ? layer.visible : true
        const instanceId = `${placement.objectIndex}-${placementIndex}`
        return (
          <ConditionalInstancedObject
            key={instanceId}
            objectIndex={placement.objectIndex}
            placement={placement}
            placementIndex={placementIndex}
            minimumInstancesForOptimization={3}
          >
            <MemoizedCompositeObject
              sceneObject={sceneObject}
              placement={placement}
              placementIndex={placementIndex}
              isSelected={isSelected(placement.objectIndex, instanceId)}
              isHovered={isHovered(placement.objectIndex, instanceId)}
              onTransform={handleObjectTransform}
              visible={isLayerVisible && (sceneObject.visible !== false) && (placement.visible !== false)}
            />
          </ConditionalInstancedObject>
        )
      })}
    </group>
  )
}
