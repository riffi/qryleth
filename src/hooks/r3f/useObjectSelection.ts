import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { useSelectedObject, useHoveredObject } from '../../features/scene/store/sceneStore'
import type { UseObjectSelectionReturn } from '../../entities/r3f/types'

export const useObjectSelection = (): UseObjectSelectionReturn => {
  const { scene } = useThree()
  const selectedObject = useSelectedObject()
  const hoveredObject = useHoveredObject()

  const selectedObjects = useMemo(() => {
    if (!selectedObject || !scene) return []

    const objects: THREE.Object3D[] = []

    scene.traverse((child) => {
      if (child.userData.generated &&
          child.userData.objectUuid === selectedObject.objectUuid) {

        // If specific instance is selected, only include that instance
        if (selectedObject.instanceId) {
          const placementUuid = selectedObject.instanceId.split('-')[1]
          if (child.userData.placementUuid === placementUuid) {
            objects.push(child)
          }
        } else {
          // If no specific instance, include all instances of this object type
          objects.push(child)
        }
      }
    })

    return objects
  }, [selectedObject, scene])

  const hoveredObjects = useMemo(() => {
    if (!hoveredObject || !scene) return []

    const objects: THREE.Object3D[] = []

    scene.traverse((child) => {
      if (child.userData.generated &&
          child.userData.objectUuid === hoveredObject.objectUuid) {

        // If specific instance is hovered, only include that instance
        if (hoveredObject.instanceId) {
          const placementUuid = hoveredObject.instanceId.split('-')[1]
          if (child.userData.placementUuid === placementUuid) {
            objects.push(child)
          }
        } else {
          // If no specific instance, include all instances of this object type
          objects.push(child)
        }
      }
    })

    return objects
  }, [hoveredObject, scene])

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

  return {
    selectedObjects,
    hoveredObjects,
    isSelected,
    isHovered
  }
}
