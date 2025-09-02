import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { useSelectedObject, useHoveredObject } from '@/features/editor/scene/model/sceneStore'
import type {
  HoveredSceneObject,
  SelectedSceneObject
} from "@/shared/types";

export interface UseMeshSelectionReturn {
  selectedObject: SelectedSceneObject | null
  hoveredObject: HoveredSceneObject | null
  selectObject: (objectUuid: string, instanceId?: string) => void
  clearSelection: () => void
  setHoveredObject: (objectUuid: string, instanceId?: string) => void
  clearHover: () => void
  selectedMeshes:  THREE.Object3D[]
  hoveredMeshes:  THREE.Object3D[]
}

export const useMeshSelection = (): UseMeshSelectionReturn => {
  const { scene } = useThree()
  const selectedObject = useSelectedObject()
  const hoveredObject = useHoveredObject()

  const selectedMeshes = useMemo(() => {
    if (!selectedObject || !scene) return []

    const meshes: THREE.Object3D[] = []

    scene.traverse((child) => {
      if (child.userData.generated &&
          child.userData.objectUuid === selectedObject.objectUuid) {

        // If specific instance is selected, only include that instance
        if (selectedObject.instanceUuid) {
          const uuid = child.userData.objectInstanceUuid
          if (uuid === selectedObject.instanceUuid) {
            meshes.push(child)
          }
        } else {
          // If no specific instance, include all instances of this object type
          meshes.push(child)
        }
      }
    })
    return meshes
  }, [selectedObject, scene])

  const hoveredMeshes = useMemo(() => {
    if (!hoveredObject || !scene) return []

    const objects: THREE.Object3D[] = []

    scene.traverse((child) => {
      if (child.userData.generated &&
          child.userData.objectUuid === hoveredObject.objectUuid) {

        // If specific instance is hovered, only include that instance
        if (hoveredObject.instanceId) {
          const uuid = child.userData.objectInstanceUuid
          if (uuid === hoveredObject.instanceId) {
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
           selectedObject.instanceUuid === instanceId
  }

  const isHovered = (objectUuid: string, instanceId?: string) => {
    if (!hoveredObject) return false
    return hoveredObject.objectUuid === objectUuid &&
           hoveredObject.instanceId === instanceId
  }

  return {
    selectedMeshes,
    hoveredMeshes,
    isSelected,
    isHovered
  }
}
