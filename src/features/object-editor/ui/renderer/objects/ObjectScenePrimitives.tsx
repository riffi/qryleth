import React from 'react'
import { PrimitiveRenderer } from '@/shared/r3f/primitives/PrimitiveRenderer.tsx'
import {
  useObjectPrimitives,
  useObjectStore,
  useObjectMaterials
} from '../../../model/objectStore.ts'

/**
 * Отрисовывает примитивы выбранного объекта и обрабатывает их выбор.
 */
export const ObjectScenePrimitives: React.FC = () => {
  const primitives = useObjectPrimitives()
  const objectMaterials = useObjectMaterials()
  const clearSelection = useObjectStore(state => state.clearSelection)
  const renderMode = useObjectStore(state => state.renderMode)

  const handleObjectClick = (event: any) => {
    event.stopPropagation()
    const primitiveIndex = event.object.userData.primitiveIndex
    const store = useObjectStore.getState()
    if (event.shiftKey) {
      store.togglePrimitiveSelection(primitiveIndex)
    } else {
      store.selectPrimitive(primitiveIndex)
    }
  }

  return (
    <group onPointerMissed={() => clearSelection()}>
      {primitives.map((primitive, index) => (
        primitive.visible === false ? null : (
          <PrimitiveRenderer
            key={index}
            primitive={primitive}
            renderMode={renderMode}
            objectMaterials={objectMaterials}
            userData={{ generated: true, primitiveIndex: index }}
            onClick={handleObjectClick}
          />
        )
      ))}
    </group>
  )
}
