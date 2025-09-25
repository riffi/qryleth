import React, { useMemo } from 'react'
import { MemoizedSceneObject } from '../optimization/OptimizedComponents'
import { InstancedObjects, useInstanceOptimization } from '@/shared/r3f/optimization/InstancedObjects.tsx'
import { ChunkedInstancedLeaves } from '@/shared/r3f/optimization/ChunkedInstancedLeaves'
import { SCENE_CHUNKED_LEAVES_ENABLED } from '@/shared/r3f/optimization/flags'
import { ChunkedTreeBillboards } from '@/shared/r3f/optimization/ChunkedTreeBillboards'
import { ChunkedInstancedTrunks } from '@/shared/r3f/optimization/ChunkedInstancedTrunks'
import { SCENE_CHUNKED_TRUNKS_ENABLED } from '@/shared/r3f/optimization/flags'
import {
  useSceneObjects,
  useSceneObjectInstances,
  useSelectedObject,
  useHoveredObject,
  useSceneLayers,
  useSceneStore
} from '@/features/editor/scene/model/sceneStore'
// События сцены: импорт через алиас scene/lib для устойчивости путей
import { useSceneEvents } from '@/features/editor/scene/lib/hooks/useSceneEvents'

export const SceneObjects: React.FC = () => {
  const objects = useSceneObjects()
  const objectInstances = useSceneObjectInstances()
  const layers = useSceneLayers()
  const selectedObject = useSelectedObject()
  const hoveredObject = useHoveredObject()
  const clearSelection = useSceneStore(state => state.clearSelection)
  const clearHover = useSceneStore(state => state.clearHover)

  const sceneEvents = useSceneEvents()

  // Calculate instance counts for optimization
  const instanceCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    objectInstances.forEach((inst) => {
      counts[inst.objectUuid] = (counts[inst.objectUuid] || 0) + 1
    })
    return counts
  }, [objectInstances])

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
      {/* Сценовая сегментация листвы: один агрегатор для всех деревьев */}
      {SCENE_CHUNKED_LEAVES_ENABLED && (
        <ChunkedInstancedLeaves
          objects={objects}
          instances={objectInstances}
          layers={layers}
          chunkSize={200}
          onClick={sceneEvents.handleClick}
          onHover={sceneEvents.handlePointerOver}
        />
      )}

      {/* LOD3 билборды деревьев по чанкам */}
      <ChunkedTreeBillboards
        objects={objects}
        instances={objectInstances}
        layers={layers}
        chunkSize={200}
        onClick={sceneEvents.handleClick}
        onHover={sceneEvents.handlePointerOver}
      />

      {/* Сегментация единых стволов по чанкам — устраняет пропадания при фрустум‑куллинге */}
      {SCENE_CHUNKED_TRUNKS_ENABLED && (
        <ChunkedInstancedTrunks
          objects={objects}
          instances={objectInstances}
          layers={layers}
          chunkSize={32}
          onClick={sceneEvents.handleClick}
          onHover={sceneEvents.handlePointerOver}
        />
      )}

      {/* Instanced objects for performance optimization (прочие примитивы) */}
      <InstancedObjects
        objects={objects}
        instances={objectInstances}
        layers={layers}
        minimumInstancesForOptimization={3}
        onClick={sceneEvents.handleClick}
        onHover={sceneEvents.handlePointerOver}
      />

      {/* Individual objects (not instanced) */}
      {objectInstances.map((instance, instanceIndex) => {
        const sceneObject = objects.find(obj => obj.uuid === instance.objectUuid)
        if (!sceneObject) return null

        // Check if this object should use instancing
        const shouldUseInstancing = useInstanceOptimization(
          instance.objectUuid,
          instanceCounts,
          3
        )

        // Skip rendering if this object is handled by instanced mesh
        if (shouldUseInstancing) {
          return null
        }

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
            onClick={sceneEvents.handleClick}
            onHover={sceneEvents.handlePointerOver}
            visible={true}
          />
        )
      })}
    </group>
  )
}
