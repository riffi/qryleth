import React from 'react'
import { MemoizedCompositeObject } from '../optimization/OptimizedComponents'
import { InstancedObjects } from '../../../shared/r3f/optimization/InstancedObjects'
import { 
  useSceneObjects, 
  useScenePlacements, 
  useSelectedObject,
  useHoveredObject,
  useSceneLayers,
  useSceneStore 
} from '../store/sceneStore'
import { useSceneEvents } from '../../../hooks/r3f/useSceneEvents'

export const SceneObjects: React.FC = () => {
  const objects = useSceneObjects()
  const placements = useScenePlacements()
  const layers = useSceneLayers()
  const selectedObject = useSelectedObject()
  const hoveredObject = useHoveredObject()
  const updatePlacement = useSceneStore(state => state.updatePlacement)
  const clearSelection = useSceneStore(state => state.clearSelection)
  const clearHover = useSceneStore(state => state.clearHover)
  
  const { handleClick, handlePointerOver, handlePointerOut } = useSceneEvents()

  const handleObjectTransform = (event: any) => {
    if (event.placementIndex !== undefined) {
      updatePlacement(event.placementIndex, {
        position: [event.position.x, event.position.y, event.position.z],
        rotation: [event.rotation.x, event.rotation.y, event.rotation.z],
        scale: [event.scale.x, event.scale.y, event.scale.z]
      })
    }
  }

  const isSelected = (objectUuid: string, instanceId?: string) => {
    if (!selectedObject) return false
    return selectedObject.objectUuid === objectUuid && 
           selectedObject.instanceId === instanceId
  }

  const isHovered = (objectUuid: string, instanceId?: string) => {
    if (!hoveredObject) return false
    return hoveredObject.objectUuid === objectUuid && 
           hoveredObject.instanceId === instanceId
  }

  return (
    <group
      onPointerMissed={() => {
        clearSelection()
        clearHover()
      }}
    >
      {/* Instanced objects for performance optimization */}
      <InstancedObjects minimumInstancesForOptimization={3} />
      
      {/* Individual objects (not instanced) */}
      {placements.map((placement, placementIndex) => {
        const sceneObject = objects.find(obj => obj.uuid === placement.objectUuid)
        if (!sceneObject) return null

        // Check layer visibility
        const layerId = sceneObject.layerId || 'objects'
        const layer = layers.find(l => l.id === layerId)
        const isLayerVisible = layer ? layer.visible : true

        const instanceId = `${placement.objectUuid}-${placement.uuid}`

        return (
          <MemoizedCompositeObject
            key={instanceId}
            sceneObject={sceneObject}
            placement={placement}
            placementIndex={placementIndex}
            isSelected={isSelected(placement.objectUuid, instanceId)}
            isHovered={isHovered(placement.objectUuid, instanceId)}
            onClick={handleClick}
            onHover={handlePointerOver}
            onTransform={handleObjectTransform}
            visible={isLayerVisible && (sceneObject.visible !== false) && (placement.visible !== false)}
          />
        )
      })}
    </group>
  )
}
