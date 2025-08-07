import React, { useMemo } from 'react'
import { Instances, Instance } from '@react-three/drei'
import { Primitive3D } from '../primitives/Primitive3D'
import type { SceneObject, SceneObjectInstance, SceneLayer } from '@/entities/scene/types'

interface InstancedObjectsProps {
  /** Список объектов сцены */
  objects: SceneObject[]
  /** Экземпляры объектов */
  instances: SceneObjectInstance[]
  /** Слои сцены */
  layers: SceneLayer[]
  /** Минимальное количество экземпляров для оптимизации */
  minimumInstancesForOptimization?: number
}

export const InstancedObjects: React.FC<InstancedObjectsProps> = ({
  objects,
  instances,
  layers,
  minimumInstancesForOptimization = 3
}) => {
  const instanceCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    instances.forEach((inst) => {
      counts[inst.objectIndex] = (counts[inst.objectIndex] || 0) + 1
    })
    return counts
  }, [instances])

  // Helper function to check if instance is visible
  const isInstanceVisible = (instance: SceneObjectInstance, objectIndex: number) => {
    const sceneObject = objects[objectIndex]
    if (!sceneObject) return false

    // Check layer visibility
    const layerId = sceneObject.layerId || 'objects'
    const layer = layers.find(l => l.id === layerId)
    const isLayerVisible = layer ? layer.visible : true

    // Check object visibility
    const isObjectVisible = sceneObject.visible !== false

    // Check instance visibility
    const isInstanceVisibleFlag = instance.visible !== false

    return isLayerVisible && isObjectVisible && isInstanceVisibleFlag
  }

  // Group object instances by object type for instancing
  const instanceGroups = useMemo(() => {
    const groups: { [objectIndex: number]: SceneObjectInstance[] } = {}

    instances.forEach(instance => {
      if (!groups[instance.objectIndex]) {
        groups[instance.objectIndex] = []
      }
      groups[instance.objectIndex].push(instance)
    })

    // Only include objects with enough instances for optimization
    const optimizedGroups: { [objectIndex: number]: SceneObjectInstance[] } = {}
    Object.entries(groups).forEach(([objectIndex, objInstances]) => {
      if (objInstances.length >= minimumInstancesForOptimization) {
        optimizedGroups[parseInt(objectIndex)] = objInstances
      }
    })

    return optimizedGroups
  }, [instances, minimumInstancesForOptimization, layers, objects])

  const renderInstancedGroup = (objectIndex: number, instancesGroup: SceneObjectInstance[]) => {
    const sceneObject = objects[objectIndex]
    if (!sceneObject || sceneObject.primitives.length === 0) return null

    // For now, only instance single-primitive objects for simplicity
    // Complex composite objects will continue using individual rendering
    if (sceneObject.primitives.length > 1) return null

    const primitive = sceneObject.primitives[0]

    return (
      <group key={`instanced-${objectIndex}`}>
        <Instances
          limit={1000} // Maximum instances
          range={instancesGroup.length}
        >
          <Primitive3D primitive={primitive} />

          {instancesGroup.map((instance, index) => {
            // Check if instance should be rendered
            if (!isInstanceVisible(instance, objectIndex)) {
              return null
            }

            // Convert instance transform arrays to individual values
                const [px, py, pz] = instance.transform?.position || [0, 0, 0]
                const [rx, ry, rz] = instance.transform?.rotation || [0, 0, 0]
                const [sx, sy, sz] = instance.transform?.scale || [1, 1, 1]

            return (
              <Instance
                key={`instance-${objectIndex}-${index}`}
                position={[px, py, pz]}
                rotation={[rx, ry, rz]}
                scale={[sx, sy, sz]}
                visible={true}
              />
            )
          })}
        </Instances>
      </group>
    )
  }

  if (Object.keys(instanceGroups).length === 0) return null


  return (
    <>
      {Object.entries(instanceGroups).map(([objectIndex, instancesGroup]) =>
        renderInstancedGroup(parseInt(objectIndex), instancesGroup)
      )}
    </>
  )
}

// Hook to check if an object should use instancing
export const useInstanceOptimization = (
  objectIndex: number,
  instanceCounts: Record<number, number>,
  minimumInstances = 3
): boolean => {
  return (instanceCounts[objectIndex] || 0) >= minimumInstances
}

// Component for conditionally rendering instances vs individual objects
interface ConditionalInstancedObjectProps {
  objectIndex: number
  instance: SceneObjectInstance
  instanceIndex: number
  minimumInstancesForOptimization?: number
  objects: SceneObject[]
  layers: SceneLayer[]
  instanceCounts: Record<number, number>
  children: React.ReactNode
}

export const ConditionalInstancedObject: React.FC<ConditionalInstancedObjectProps> = ({
  objectIndex,
  instance,
  instanceIndex,
  minimumInstancesForOptimization = 3,
  children,
  objects,
  layers,
  instanceCounts
}) => {
  const shouldUseInstancing = useInstanceOptimization(
    objectIndex,
    instanceCounts,
    minimumInstancesForOptimization
  )

  // If this object should use instancing, don't render individual instance
  // It will be handled by InstancedObjects component
  if (shouldUseInstancing) {
    return null
  }

  // Check complete visibility (layer, object, instance)
  const sceneObject = objects[objectIndex]
  if (!sceneObject) return null

  const layerId = sceneObject.layerId || 'objects'
  const layer = layers.find(l => l.id === layerId)
  const isLayerVisible = layer ? layer.visible : true
  const isObjectVisible = sceneObject.visible !== false
  const isInstanceVisibleFlag = instance.visible !== false

  const isCompletelyVisible = isLayerVisible && isObjectVisible && isInstanceVisibleFlag

  if (!isCompletelyVisible) {
    return null
  }

  // Otherwise render as individual object
  return <>{children}</>
}

