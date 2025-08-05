import React from 'react'
import { PrimitiveRenderer } from '@/shared/r3f/primitives/PrimitiveRenderer.tsx'
import type { RenderMode } from '@/shared/types/ui'
import type { GfxMaterial } from '@/entities/material'
import {
  useGroupChildren,
  useGroupVisibility,
  useGroupPrimitives
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

  return (
    <group visible={isVisible} userData={{ groupUuid }}>
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
