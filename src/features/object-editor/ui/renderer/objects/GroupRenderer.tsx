import React from 'react'
import { PrimitiveRenderer } from '@/shared/r3f/primitives/PrimitiveRenderer.tsx'
import type { RenderMode } from '@/shared/types/ui'
import type { GfxMaterial } from '@/entities/material'
import {
  useGroupChildren,
  useGroupVisibility,
  useGroupPrimitives,
  useGroupByUuid
} from '../../../model/objectStore.ts'

export interface GroupRendererProps {
  /** UUID группы, которую нужно отрисовать */
  groupUuid: string
  /** Режим рендеринга примитивов */
  renderMode: RenderMode
  /** Список материалов объекта */
  objectMaterials: GfxMaterial[]
  /** Обработчик клика по примитиву */
  onPrimitiveClick: (event: any) => void
}

/**
 * Рекурсивно отображает группу примитивов и все её подгруппы,
 * обеспечивая наследование видимости и корректную передачу `groupUuid`.
 */
export const GroupRenderer: React.FC<GroupRendererProps> = ({
  groupUuid,
  renderMode,
  objectMaterials,
  onPrimitiveClick
}) => {
  const isVisible = useGroupVisibility(groupUuid)
  const childGroups = useGroupChildren(groupUuid)
  const primitives = useGroupPrimitives(groupUuid)
  const group = useGroupByUuid(groupUuid)

  // Применяем transform группы если он есть
  const groupTransform = group?.transform
  const position = groupTransform?.position ? [groupTransform.position.x, groupTransform.position.y, groupTransform.position.z] : undefined
  const rotation = groupTransform?.rotation ? [groupTransform.rotation.x, groupTransform.rotation.y, groupTransform.rotation.z] : undefined
  const scale = groupTransform?.scale ? [groupTransform.scale.x, groupTransform.scale.y, groupTransform.scale.z] : undefined

  return (
    <group 
      visible={isVisible} 
      userData={{ groupUuid }}
      position={position}
      rotation={rotation}
      scale={scale}
    >
      {primitives.map(({ primitive, index }) => (
        primitive.visible === false ? null : (
          <PrimitiveRenderer
            // Используем составной ключ, чтобы примитив корректно
            // перемонтировался при смене группы
            key={`${groupUuid}-${primitive.uuid}`}
            primitive={primitive}
            renderMode={renderMode}
            objectMaterials={objectMaterials}
            userData={{ generated: true, primitiveIndex: index, groupUuid }}
            onClick={onPrimitiveClick}
          />
        )
      ))}
      {childGroups.map(child => (
        <GroupRenderer
          key={child.uuid}
          groupUuid={child.uuid}
          renderMode={renderMode}
          objectMaterials={objectMaterials}
          onPrimitiveClick={onPrimitiveClick}
        />
      ))}
    </group>
  )
}
