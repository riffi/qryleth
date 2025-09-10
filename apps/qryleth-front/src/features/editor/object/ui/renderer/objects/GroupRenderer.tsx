import React from 'react'
import {PrimitiveRenderer} from '@/shared/r3f/primitives/PrimitiveRenderer.tsx'
import { paletteRegistry } from '@/shared/lib/palette'
import { usePalettePreviewUuid } from '../../../model/palettePreviewStore.ts'
import type {RenderMode} from '@/shared/types/ui'
import type {GfxMaterial} from '@/entities/material'
import {
  useGroupChildren,
  useGroupVisibility,
  useGroupPrimitives,
  useGroupByUuid,
  useTemporaryGroupTransform
} from '../../../model/objectStore.ts'

export interface GroupRendererProps {
  /** UUID группы, которую нужно отрисовать */
  groupUuid: string,
  /** Режим рендеринга примитивов */
  renderMode: RenderMode,
  /** Список материалов объекта */
  objectMaterials: GfxMaterial[],
  /** Обработчик клика по примитиву */
  onPrimitiveClick: (event: any) => void,
  groupName?: string
}

/**
 * Рекурсивно отображает группу примитивов и все её подгруппы,
 * обеспечивая наследование видимости и корректную передачу `groupUuid`.
 */
export const GroupRenderer: React.FC<GroupRendererProps> = ({
                                                              groupUuid,
                                                              renderMode,
                                                              objectMaterials,
                                                              onPrimitiveClick,
                                                              groupName
                                                            }) => {
  const isVisible = useGroupVisibility(groupUuid)
  const childGroups = useGroupChildren(groupUuid)
  const primitives = useGroupPrimitives(groupUuid)
  const group = useGroupByUuid(groupUuid)
  const temporaryTransform = useTemporaryGroupTransform(groupUuid)
  // Выбранная палитра предпросмотра (только для отображения)
  const paletteUuid = usePalettePreviewUuid()

  // Используем временную трансформацию если есть, иначе постоянную
  const activeTransform = temporaryTransform || group?.transform

  // Обрабатываем различные форматы координат (массив для временных, объект для постоянных)
  const position = activeTransform?.position ? (
      Array.isArray(activeTransform.position)
          ? [activeTransform.position[0], activeTransform.position[1], activeTransform.position[2]]
          : [activeTransform.position.x, activeTransform.position.y, activeTransform.position.z]
  ) : undefined

  const rotation = activeTransform?.rotation ? (
      Array.isArray(activeTransform.rotation)
          ? [activeTransform.rotation[0], activeTransform.rotation[1], activeTransform.rotation[2]]
          : [activeTransform.rotation.x, activeTransform.rotation.y, activeTransform.rotation.z]
  ) : undefined

  const scale = activeTransform?.scale ? (
      Array.isArray(activeTransform.scale)
          ? [activeTransform.scale[0], activeTransform.scale[1], activeTransform.scale[2]]
          : [activeTransform.scale.x, activeTransform.scale.y, activeTransform.scale.z]
  ) : undefined

  return (
      <group
          visible={isVisible}
          name={groupName}
          userData={{groupUuid}}
          position={position}
          rotation={rotation}
          scale={scale}
      >
        {primitives.map(({primitive, index}) => (
            primitive.visible === false ? null : (
                <PrimitiveRenderer
                    // Используем составной ключ, чтобы примитив корректно
                    // перемонтировался при смене группы
                    key={`${groupUuid}-${primitive.uuid}`}
                    primitive={primitive}
                    renderMode={renderMode}
                    objectMaterials={objectMaterials}
                    activePalette={(paletteRegistry.get(paletteUuid) || paletteRegistry.get('default')) as any}
                    userData={{generated: true, primitiveIndex: index, groupUuid}}
                    onClick={onPrimitiveClick}
                />
            )
        ))}
        {childGroups.map(child => (
            <GroupRenderer
                key={child.uuid}
                groupUuid={child.uuid}
                groupName={child.name}
                renderMode={renderMode}
                objectMaterials={objectMaterials}
                onPrimitiveClick={onPrimitiveClick}
            />
        ))}
      </group>
  )
}
