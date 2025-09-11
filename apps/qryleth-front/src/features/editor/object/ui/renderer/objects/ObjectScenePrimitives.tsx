import React from 'react'
import { PrimitiveRenderer } from '@/shared/r3f/primitives/PrimitiveRenderer.tsx'
import { paletteRegistry } from '@/shared/lib/palette'
import { usePalettePreviewUuid } from '../../../model/palettePreviewStore.ts'
import { GroupRenderer } from './GroupRenderer.tsx'
import { InstancedBranchesOE } from './InstancedBranchesOE'
import { InstancedLeavesOE } from './InstancedLeavesOE'
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
  // Выбранная палитра предпросмотра из ObjectEditor (только для отображения)
  const paletteUuid = usePalettePreviewUuid()

  /**
   * Обрабатывает клик по примитиву, поддерживая выделение групп через Ctrl+Click
   * и множественный выбор примитивов через Shift+Click.
   */
  const handleObjectClick = (event: any) => {
    event.stopPropagation()
    const primitiveIndex = event.object.userData.primitiveIndex
    const groupUuid = event.object.userData.groupUuid
    const store = useObjectStore.getState()

    if (event.ctrlKey && groupUuid) {
      // Ctrl+Click на примитив в группе = выделить группу
      if (event.shiftKey) {
        store.toggleGroupSelection(groupUuid)
      } else {
        store.selectGroup(groupUuid)
      }
    } else if (event.shiftKey) {
      // Shift+Click = множественное выделение примитивов
      store.togglePrimitiveSelection(primitiveIndex)
    } else {
      // Обычный клик = выделить примитив
      store.selectPrimitive(primitiveIndex)
    }
  }

  // Подготовим инстанс‑массивы для не сгруппированных листьев и цилиндров,
  // чтобы в ObjectEditor дерево выглядело так же, как в SceneEditor.
  const ungrouped = primitives
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => !groupAssignments[p.uuid] && p.visible !== false)

  const ungroupedCylinders = ungrouped.filter(({ p }) => p.type === 'trunk' || p.type === 'branch')
  const ungroupedLeaves = ungrouped.filter(({ p }) => p.type === 'leaf')

  return (
    <group onPointerMissed={() => clearSelection()}>
      {/* Инстанс‑отрисовка для не сгруппированных цилиндров (ствол/ветви) */}
      {ungroupedCylinders.length > 0 && (
        <InstancedBranchesOE
          cylinders={ungroupedCylinders.map(({ p, idx }) => ({ primitive: p, index: idx })) as any}
          objectMaterials={objectMaterials}
          onPrimitiveClick={handleObjectClick}
          onPrimitiveHover={() => {}}
        />
      )}

      {/* Инстанс‑отрисовка для не сгруппированных листьев (плоские биллборды) */}
      {ungroupedLeaves.length > 0 && (
        <InstancedLeavesOE
          leaves={ungroupedLeaves.map(({ p, idx }) => ({ primitive: p, index: idx })) as any}
          objectMaterials={objectMaterials}
          onPrimitiveClick={handleObjectClick}
          onPrimitiveHover={() => {}}
        />
      )}

      {rootGroups.map(group => (
        <GroupRenderer
          key={group.uuid}
          groupUuid={group.uuid}
          groupName={group.name}
          renderMode={renderMode}
          objectMaterials={objectMaterials}
          onPrimitiveClick={handleObjectClick}
        />
      ))}
      {primitives.map((primitive, index) => (
        // Для несгруппированных цилиндров и листьев уже есть инстанс‑варианты — пропускаем их,
        // остальные примитивы отображаем обычным путём
        groupAssignments[primitive.uuid] || primitive.visible === false
          ? null
          : (primitive.type === 'trunk' || primitive.type === 'branch' || primitive.type === 'leaf')
            ? null
            : (
              <PrimitiveRenderer
                key={`root-${primitive.uuid}`}
                primitive={primitive}
                renderMode={renderMode}
                objectMaterials={objectMaterials}
                activePalette={(paletteRegistry.get(paletteUuid) || paletteRegistry.get('default')) as any}
                userData={{ generated: true, primitiveIndex: index }}
                onClick={handleObjectClick}
              />
            )
      ))}
    </group>
  )
}
