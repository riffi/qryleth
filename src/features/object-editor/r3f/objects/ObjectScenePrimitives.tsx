import React from 'react'
import { PrimitiveRenderer } from '@/shared/r3f/primitives/PrimitiveRenderer.tsx'
import {
  useObjectPrimitives,
  useObjectStore
} from '../../model/objectStore'

export const ObjectScenePrimitives: React.FC = () => {
  const primitives = useObjectPrimitives()
  const clearSelection = useObjectStore(state => state.clearSelection)
  const renderMode = useObjectStore(state => state.renderMode)

  const handleObjectClick = (event: any) => {
    event.stopPropagation()
    const primitiveIndex = event.object.userData.primitiveIndex
    useObjectStore.getState().selectPrimitive(primitiveIndex)
  }

  return (
    <group onPointerMissed={() => clearSelection()}>
      {primitives.map((primitive, index) => (
        <PrimitiveRenderer
          key={index}
          primitive={primitive}
          renderMode={renderMode}
          userData={{ generated: true, primitiveIndex: index }}
          onClick={handleObjectClick}
        />
      ))}
    </group>
  )
}
