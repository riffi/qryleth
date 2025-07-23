import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import {
  useObjectSelectedPrimitiveId,
  useObjectHoveredPrimitiveId
} from '@/features/object-editor'


export interface UsePrimitiveSelectionReturn {
  selectedPrimitive: {
    objectUuid: string
    primitiveIndex: number
    instanceId?: string
  } | null
  selectPrimitive: (objectUuid: string, primitiveIndex: number, instanceId?: string) => void
  clearPrimitiveSelection: () => void
  selectedMeshes: THREE.Object3D[]
}

export const useOEPrimitiveSelection = (): UsePrimitiveSelectionReturn => {
  const { scene } = useThree()
  const selectedId = useObjectSelectedPrimitiveId()
  const hoveredId = useObjectHoveredPrimitiveId()

  const selectedMeshes = useMemo(() => {
    if (selectedId === null || !scene) return []
    const objects: THREE.Object3D[] = []
    scene.traverse(child => {
      if (child.userData.generated && child.userData.primitiveIndex === selectedId) {
        objects.push(child)
      }
    })
    return objects
  }, [selectedId, scene])

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

  const isSelected = (index: number) => selectedId === index

  const isHovered = (index: number) => hoveredId === index

  return { selectedMeshes, hoveredObjects, isSelected, isHovered }
}
