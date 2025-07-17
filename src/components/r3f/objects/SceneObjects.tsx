import React from 'react'
import { MemoizedCompositeObject } from '../optimization/OptimizedComponents'
import { InstancedObjects, ConditionalInstancedObject } from '../optimization/InstancedObjects'
import { 
  useSceneObjects, 
  useScenePlacements, 
  useSelectedObject,
  useHoveredObject,
  useSceneLayers,
  useSceneStore 
} from '../../../stores/sceneStore'
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

  const isSelected = (objectIndex: number, instanceId?: string) => {
    if (!selectedObject) return false
    return selectedObject.objectIndex === objectIndex && 
           selectedObject.instanceId === instanceId
  }

  const isHovered = (objectIndex: number, instanceId?: string) => {
    if (!hoveredObject) return false
    return hoveredObject.objectIndex === objectIndex && 
           hoveredObject.instanceId === instanceId
  }

  return (
    <group
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerMissed={() => {
        clearSelection()
        clearHover()
      }}
    >
      {/* Instanced objects for performance optimization */}
      <InstancedObjects minimumInstancesForOptimization={3} />
      
      {/* Individual objects (not instanced) */}
      {placements.map((placement, placementIndex) => {
        const sceneObject = objects[placement.objectIndex]
        if (!sceneObject) return null

        // Check layer visibility
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
              onClick={handleClick}
              onHover={handlePointerOver}
              onTransform={handleObjectTransform}
              visible={isLayerVisible && (sceneObject.visible !== false)}
            />
          </ConditionalInstancedObject>
        )
      })}
    </group>
  )
}
