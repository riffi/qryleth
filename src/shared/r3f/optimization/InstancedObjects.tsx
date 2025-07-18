import React, { useMemo } from 'react'
import { Instances, Instance } from '@react-three/drei'
import { Primitive3D } from '../primitives/Primitive3D'
import type {ScenePlacement} from "../../../entities/scene/types.ts";
import {useObjectInstanceCounts, useSceneObjectsOptimized, useScenePlacementsOptimized} from "../../../features/scene/store/optimizedSelectors.ts";

interface InstancedObjectsProps {
  minimumInstancesForOptimization?: number // Minimum instances before using instancing
}

export const InstancedObjects: React.FC<InstancedObjectsProps> = ({
  minimumInstancesForOptimization = 3
}) => {
  const objects = useSceneObjectsOptimized()
  const placements = useScenePlacementsOptimized()
  const instanceCounts = useObjectInstanceCounts()

  // Group placements by object type for instancing
  const instanceGroups = useMemo(() => {
    const groups: { [objectIndex: number]: ScenePlacement[] } = {}

    placements.forEach(placement => {
      if (!groups[placement.objectIndex]) {
        groups[placement.objectIndex] = []
      }
      groups[placement.objectIndex].push(placement)
    })

    // Only include objects with enough instances for optimization
    const optimizedGroups: { [objectIndex: number]: ScenePlacement[] } = {}
    Object.entries(groups).forEach(([objectIndex, instancePlacements]) => {
      if (instancePlacements.length >= minimumInstancesForOptimization) {
        optimizedGroups[parseInt(objectIndex)] = instancePlacements
      }
    })

    return optimizedGroups
  }, [placements, minimumInstancesForOptimization])

  const renderInstancedGroup = (objectIndex: number, instancePlacements: ScenePlacement[]) => {
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
          range={instancePlacements.length}
        >
          <Primitive3D primitive={primitive} />

          {instancePlacements.map((placement, index) => {
            // Convert placement arrays to individual values
            const [px, py, pz] = placement.transform?.position || [0, 0, 0]
            const [rx, ry, rz] = placement.transform?.rotation || [0, 0, 0]
            const [sx, sy, sz] = placement.transform?.scale || [1, 1, 1]

            return (
              <Instance
                key={`instance-${objectIndex}-${index}`}
                position={[px, py, pz]}
                rotation={[rx, ry, rz]}
                scale={[sx, sy, sz]}
                visible={placement.visible !== false}
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
      {Object.entries(instanceGroups).map(([objectIndex, instancePlacements]) =>
        renderInstancedGroup(parseInt(objectIndex), instancePlacements)
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
  placement: ScenePlacement
  placementIndex: number
  minimumInstancesForOptimization?: number
  children: React.ReactNode
}

export const ConditionalInstancedObject: React.FC<ConditionalInstancedObjectProps> = ({
  objectIndex,
  placement,
  placementIndex,
  minimumInstancesForOptimization = 3,
  children
}) => {
  const shouldUseInstancing = useInstanceOptimization(objectIndex, minimumInstancesForOptimization)

  // If this object should use instancing, don't render individual instance
  // It will be handled by InstancedObjects component
  if (shouldUseInstancing) {
    return null
  }

  if (placement.visible === false) {
    return null
  }

  // Otherwise render as individual object
  return <>{children}</>
}
