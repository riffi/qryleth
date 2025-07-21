import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import {
  useObjectSelectedPrimitiveId,
  useObjectHoveredPrimitiveId
} from '@/features/object-editor/store/objectStore.ts'
import type {UsePrimitiveSelectionReturn} from '@/entities/r3f/types.ts'

export const useOEPrimitiveSelection = (): UsePrimitiveSelectionReturn => {
  const { scene } = useThree()
  const selectedId = useObjectSelectedPrimitiveId()
  const hoveredId = useObjectHoveredPrimitiveId()

  const selectedObjects = useMemo(() => {
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

  return { selectedObjects, hoveredObjects, isSelected, isHovered }
}
