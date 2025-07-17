import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { useSelectedObject, useHoveredObject } from '../../stores/sceneStore'
import type { UseObjectSelectionReturn } from '../../types/r3f'

export const useObjectSelection = (): UseObjectSelectionReturn => {
  const { scene } = useThree()
  const selectedObject = useSelectedObject()
  const hoveredObject = useHoveredObject()

  const selectedObjects = useMemo(() => {
    if (!selectedObject || !scene) return []

    const objects: THREE.Object3D[] = []
    
    scene.traverse((child) => {
      if (child.userData.generated && 
          child.userData.objectIndex === selectedObject.objectIndex) {
        
        // If specific instance is selected, only include that instance
        if (selectedObject.instanceId) {
          const placementIndex = parseInt(selectedObject.instanceId.split('-')[1])
          if (child.userData.placementIndex === placementIndex) {
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
          child.userData.objectIndex === hoveredObject.objectIndex) {
        
        // If specific instance is hovered, only include that instance
        if (hoveredObject.instanceId) {
          const placementIndex = parseInt(hoveredObject.instanceId.split('-')[1])
          if (child.userData.placementIndex === placementIndex) {
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

  return {
    selectedObjects,
    hoveredObjects,
    isSelected,
    isHovered
  }
}