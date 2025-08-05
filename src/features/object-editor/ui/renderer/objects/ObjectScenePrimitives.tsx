import React from 'react'
import { PrimitiveRenderer } from '@/shared/r3f/primitives/PrimitiveRenderer.tsx'
import { GroupRenderer } from './GroupRenderer.tsx'
import {
  useObjectPrimitives,
  useObjectStore,
  useObjectMaterials,
  useRootGroups,
  usePrimitiveGroupAssignments
} from '../../../model/objectStore.ts'

/**
 * Отрисовывает примитивы и группы выбранного объекта, а также обрабатывает их выбор.
 */
export const ObjectScenePrimitives: React.FC = () => {
  const primitives = useObjectPrimitives()
  const groupAssignments = usePrimitiveGroupAssignments()
  const rootGroups = useRootGroups()
  const objectMaterials = useObjectMaterials()
  const clearSelection = useObjectStore(state => state.clearSelection)
  const renderMode = useObjectStore(state => state.renderMode)

  /**
   * Обрабатывает клик по примитиву, поддерживая множественный выбор через Shift.
   */
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
      {rootGroups.map(group => (
        <GroupRenderer
          key={group.uuid}
          groupUuid={group.uuid}
          renderMode={renderMode}
          objectMaterials={objectMaterials}
          onPrimitiveClick={handleObjectClick}
        />
      ))}
      {primitives.map((primitive, index) => (
        groupAssignments[primitive.uuid] || primitive.visible === false ? null : (
          <PrimitiveRenderer
            // Ключ включает префикс "root" для корректного
            // перемонтирования при перемещении примитива в группу
            key={`root-${primitive.uuid}`}
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
