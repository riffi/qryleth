import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { useObjectSelected, useObjectHovered } from '../../features/object-editor/store/objectStore'
import type { UseObjectSelectionReturn } from '../../entities/r3f/types'

export const useOEObjectSelection = (): UseObjectSelectionReturn => {
  const { scene } = useThree()
  const selectedObject = useObjectSelected()
  const hoveredObject = useObjectHovered()

  const selectedObjects = useMemo(() => {
    if (!selectedObject || !scene) return []
    const objects: THREE.Object3D[] = []
    scene.traverse((child) => {
      if (child.userData.generated && child.userData.objectIndex === selectedObject.objectIndex) {
        if (selectedObject.instanceId) {
          const placementIndex = parseInt(selectedObject.instanceId.split('-')[1])
          if (child.userData.placementIndex === placementIndex) {
            objects.push(child)
          }
        } else {
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
      if (child.userData.generated && child.userData.objectIndex === hoveredObject.objectIndex) {
        if (hoveredObject.instanceId) {
          const placementIndex = parseInt(hoveredObject.instanceId.split('-')[1])
          if (child.userData.placementIndex === placementIndex) {
            objects.push(child)
          }
        } else {
          objects.push(child)
        }
      }
    })
    return objects
  }, [hoveredObject, scene])

  const isSelected = (objectIndex: number, instanceId?: string) => {
    if (!selectedObject) return false
    return selectedObject.objectIndex === objectIndex && selectedObject.instanceId === instanceId
  }

  const isHovered = (objectIndex: number, instanceId?: string) => {
    if (!hoveredObject) return false
    return hoveredObject.objectIndex === objectIndex && hoveredObject.instanceId === instanceId
  }

  return { selectedObjects, hoveredObjects, isSelected, isHovered }
}
