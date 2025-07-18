import React from 'react'
import { PrimitiveRenderer } from '../../../../shared/r3f/primitives/PrimitiveRenderer'
import {
  useObjectObjects,
  useObjectPlacements,
  useObjectSelected,
  useObjectStore
} from '../../store/objectStore'

export const ObjectSceneObjects: React.FC = () => {
  const objects = useObjectObjects()
  const placements = useObjectPlacements()
  const selectedObject = useObjectSelected()
  const clearSelection = useObjectStore(state => state.clearSelection)
  const renderMode = useObjectStore(state => state.renderMode)

  const handleObjectClick = (event: any) => {
    event.stopPropagation()
    const primitiveIndex = event.object.userData.primitiveIndex
    const instanceId = `${primitiveIndex}-0`
    useObjectStore.getState().selectObject(primitiveIndex, instanceId)
  }

  return (
    <group onPointerMissed={() => clearSelection()}>
      {objects.map((obj, objectIndex) => {
        const placement = placements[objectIndex]
        if (!placement) return null
        
        // Render each primitive directly
        return obj.primitives.map((primitive, primitiveIndex) => (
          <PrimitiveRenderer
            key={`${objectIndex}-${primitiveIndex}`}
            primitive={primitive}
            renderMode={renderMode}
            userData={{
              generated: true,
              primitiveIndex: objectIndex, // Use objectIndex as primitiveIndex
              objectIndex: objectIndex
            }}
            onClick={handleObjectClick}
          />
        ))
      })}
    </group>
  )
}
