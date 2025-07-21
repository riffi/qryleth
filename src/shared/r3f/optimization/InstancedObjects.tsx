import React, { useMemo } from 'react'
import { Instances, Instance } from '@react-three/drei'
import { Primitive3D } from '../primitives/Primitive3D'
import type { SceneObjectInstance } from '@/entities/scene/types'
import {
  useObjectInstanceCounts,
  useSceneObjectsOptimized,
  useSceneObjectInstancesOptimized
} from '@/features/scene/store/optimizedSelectors'

interface InstancedObjectsProps {
  minimumInstancesForOptimization?: number // Minimum instances before using instancing
}

export const InstancedObjects: React.FC<InstancedObjectsProps> = ({
  minimumInstancesForOptimization = 3
}) => {
  const objects = useSceneObjectsOptimized()
  const instances = useSceneObjectInstancesOptimized()
  const instanceCounts = useObjectInstanceCounts()

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
  }, [instances, minimumInstancesForOptimization])

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
                visible={instance.visible !== false}
              />
            )
          })}
        </Instances>
      </group>
    )
  }

  if (Object.keys(instanceGroups).length === 0) return null

  console.log('Rendering instanced objects for object indices:', Object.keys(instanceGroups))

  return (
    <>
      {Object.entries(instanceGroups).map(([objectIndex, instancesGroup]) =>
        renderInstancedGroup(parseInt(objectIndex), instancesGroup)
      )}
    </>
  )
}

// Hook to check if an object should use instancing
export const useInstanceOptimization = (objectIndex: number, minimumInstances = 3): boolean => {
  const instanceCounts = useObjectInstanceCounts()
  return (instanceCounts[objectIndex] || 0) >= minimumInstances
}

// Component for conditionally rendering instances vs individual objects
interface ConditionalInstancedObjectProps {
  objectIndex: number
  instance: SceneObjectInstance
  instanceIndex: number
  minimumInstancesForOptimization?: number
  children: React.ReactNode
}

export const ConditionalInstancedObject: React.FC<ConditionalInstancedObjectProps> = ({
  objectIndex,
  instance,
  instanceIndex,
  minimumInstancesForOptimization = 3,
  children
}) => {
  const shouldUseInstancing = useInstanceOptimization(objectIndex, minimumInstancesForOptimization)

  // If this object should use instancing, don't render individual instance
  // It will be handled by InstancedObjects component
  if (shouldUseInstancing) {
    return null
  }

  if (instance.visible === false) {
    return null
  }

  // Otherwise render as individual object
  return <>{children}</>
}
