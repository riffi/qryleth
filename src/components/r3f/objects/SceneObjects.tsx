import React from 'react'
import { CompositeObject } from './CompositeObject'
import { 
  useSceneObjects, 
  useScenePlacements, 
  useSelectedObject,
  useHoveredObject,
  useSceneStore 
} from '../../../stores/sceneStore'

export const SceneObjects: React.FC = () => {
  const objects = useSceneObjects()
  const placements = useScenePlacements()
  const selectedObject = useSelectedObject()
  const hoveredObject = useHoveredObject()
  const selectObject = useSceneStore(state => state.selectObject)
  const setHoveredObject = useSceneStore(state => state.setHoveredObject)
  const clearSelection = useSceneStore(state => state.clearSelection)
  const clearHover = useSceneStore(state => state.clearHover)
  const updatePlacement = useSceneStore(state => state.updatePlacement)

  const handleObjectClick = (event: any) => {
    if (event.objectIndex !== undefined) {
      selectObject(event.objectIndex, event.instanceId)
    } else {
      clearSelection()
    }
  }

  const handleObjectHover = (event: any) => {
    if (event.objectIndex !== undefined) {
      setHoveredObject(event.objectIndex, event.instanceId)
    }
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
      onClick={(event) => {
        // Handle clicks on empty space
        if (event.eventObject === event.object) {
          clearSelection()
        }
      }}
      onPointerMissed={() => {
        clearSelection()
        clearHover()
      }}
    >
      {placements.map((placement, placementIndex) => {
        const sceneObject = objects[placement.objectIndex]
        if (!sceneObject) return null

        const instanceId = `${placement.objectIndex}-${placementIndex}`

        return (
          <CompositeObject
            key={instanceId}
            sceneObject={sceneObject}
            placement={placement}
            placementIndex={placementIndex}
            isSelected={isSelected(placement.objectIndex, instanceId)}
            isHovered={isHovered(placement.objectIndex, instanceId)}
            onClick={handleObjectClick}
            onHover={handleObjectHover}
            onTransform={handleObjectTransform}
          />
        )
      })}
    </group>
  )
}