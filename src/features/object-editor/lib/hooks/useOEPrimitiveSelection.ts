import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import {
  useObjectSelectedPrimitiveIds,
  useObjectHoveredPrimitiveId
} from '@/features/object-editor'


export interface UsePrimitiveSelectionReturn {
  selectedMeshes: THREE.Object3D[]
  hoveredObjects: THREE.Object3D[]
  isSelected: (index: number) => boolean
  isHovered: (index: number) => boolean
}

export const useOEPrimitiveSelection = (): UsePrimitiveSelectionReturn => {
  const { scene } = useThree()
  const selectedIds = useObjectSelectedPrimitiveIds()
  const hoveredId = useObjectHoveredPrimitiveId()

  const selectedMeshes = useMemo(() => {
    if (!scene || selectedIds.length === 0) return []
    const objects: THREE.Object3D[] = []
    scene.traverse(child => {
      if (child.userData.generated && selectedIds.includes(child.userData.primitiveIndex)) {
        objects.push(child)
      }
    })
    return objects
  }, [selectedIds, scene])

  const hoveredObjects = useMemo(() => {
    if (hoveredId === null || !scene) return []
    const objects: THREE.Object3D[] = []
    scene.traverse(child => {
      if (child.userData.generated && child.userData.primitiveIndex === hoveredId) {
        objects.push(child)
      }
    })
    return objects
  }, [hoveredId, scene])

  const isSelected = (index: number) => selectedIds.includes(index)

  const isHovered = (index: number) => hoveredId === index

  return { selectedMeshes, hoveredObjects, isSelected, isHovered }
}
