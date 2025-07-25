import React from 'react'
import { MemoizedSceneObject } from '@/features/scene'
import { InstancedObjects } from '@/shared/r3f/optimization/InstancedObjects.tsx'
import {
  useSceneObjects,
  useSceneObjectInstances,
  useSelectedObject,
  useHoveredObject,
  useSceneLayers,
  useSceneStore
} from '@/features/scene'
import { useSceneEvents } from '../../../lib/hooks/useSceneEvents'

export const SceneObjects: React.FC = () => {
  const objects = useSceneObjects()
  const objectInstances = useSceneObjectInstances()
  const layers = useSceneLayers()
  const selectedObject = useSelectedObject()
  const hoveredObject = useHoveredObject()
  const updateObjectInstance = useSceneStore(state => state.updateObjectInstance)
  const clearSelection = useSceneStore(state => state.clearSelection)
  const clearHover = useSceneStore(state => state.clearHover)

  const { handleClick, handlePointerOver, handlePointerOut } = useSceneEvents()

  const handleObjectTransform = (event: any) => {
    if (event.objectInstanceIndex !== undefined) {
      updateObjectInstance(event.objectInstanceIndex, {
        position: [event.position.x, event.position.y, event.position.z],
        rotation: [event.rotation.x, event.rotation.y, event.rotation.z],
        scale: [event.scale.x, event.scale.y, event.scale.z]
      })
    }
  }

  const isSelected = (objectUuid: string, instanceId?: string) => {
    if (!selectedObject) return false
    return selectedObject.objectUuid === objectUuid &&
           selectedObject.instanceUuid === instanceId
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
      <InstancedObjects
        objects={objects}
        instances={objectInstances}
        layers={layers}
        minimumInstancesForOptimization={3}
      />

      {/* Individual objects (not instanced) */}
      {objectInstances.map((instance, instanceIndex) => {
        const sceneObject = objects.find(obj => obj.uuid === instance.objectUuid)
        if (!sceneObject) return null

        // Check layer visibility
        const layerId = sceneObject.layerId || 'objects'
        const layer = layers.find(l => l.id === layerId)
        const isLayerVisible = layer ? layer.visible : true

        // Check complete visibility (layer, object, instance)
        const isCompletelyVisible = isLayerVisible &&
                                   (sceneObject.visible !== false) &&
                                   (instance.visible !== false)

        // Don't render hidden objects at all to exclude them from ray casting
        if (!isCompletelyVisible) {
          return null
        }

        const instanceId = `${instance.objectUuid}-${instance.uuid}`

        return (
          <MemoizedSceneObject
            key={instanceId}
            sceneObject={sceneObject}
            instance={instance}
            instanceIndex={instanceIndex}
            isSelected={isSelected(instance.objectUuid, instanceId)}
            isHovered={isHovered(instance.objectUuid, instanceId)}
            onClick={handleClick}
            onHover={handlePointerOver}
            onTransform={handleObjectTransform}
            visible={true}
          />
        )
      })}
    </group>
  )
}
