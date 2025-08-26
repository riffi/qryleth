import React from 'react'
import { PrimitiveRenderer } from '@/shared/r3f/primitives/PrimitiveRenderer.tsx'
import { GroupRenderer } from '../../ui/renderer/objects/GroupRenderer.tsx'
import { buildGroupTree } from '@/entities/primitiveGroup/model/utils'
import type { RenderMode } from '@/shared/types/ui'
import type { GfxObject } from '@/entities/object'
import type { GfxPrimitiveGroup } from '@/entities/primitiveGroup'

export interface ObjectRendererR3FProps {
  /** Объект для рендеринга */
  gfxObject: GfxObject
  /** Режим рендеринга */
  renderMode?: RenderMode
}

/**
 * Переиспользуемый R3F компонент для рендеринга GfxObject.
 * Используется как в основном редакторе, так и для генерации превью.
 * 
 * Поддерживает группы примитивов с трансформациями и правильную иерархию.
 */
export const ObjectRendererR3F: React.FC<ObjectRendererR3FProps> = ({
  gfxObject,
  renderMode = 'solid'
}) => {
  const { primitives, primitiveGroups = {}, primitiveGroupAssignments = {}, materials = [] } = gfxObject

  // Строим дерево групп для определения корневых групп
  const rootGroups = React.useMemo(() => {
    const groupTree = buildGroupTree(primitiveGroups)
    return groupTree.filter(group => !group.parentGroupUuid)
  }, [primitiveGroups])

  /**
   * Пустой обработчик клика для превью (не нужен интерактив)
   */
  const handleObjectClick = () => {
    // В режиме превью кликов не обрабатываем
  }

  return (
    <group>
      {/* Рендерим корневые группы с их подгруппами */}
      {rootGroups.map(group => (
        <GroupRendererStatic
          key={group.uuid}
          group={group}
          allGroups={primitiveGroups}
          primitives={primitives}
          groupAssignments={primitiveGroupAssignments}
          renderMode={renderMode}
          objectMaterials={materials}
          onPrimitiveClick={handleObjectClick}
        />
      ))}
      
      {/* Рендерим примитивы, не привязанные к группам */}
      {primitives.map((primitive, index) => (
        primitiveGroupAssignments[primitive.uuid] || primitive.visible === false ? null : (
          <PrimitiveRenderer
            key={`root-${primitive.uuid}`}
            primitive={primitive}
            renderMode={renderMode}
            objectMaterials={materials}
            userData={{ generated: true, primitiveIndex: index }}
            onClick={handleObjectClick}
          />
        )
      ))}
    </group>
  )
}

/**
 * Статический рендерер группы для превью (без подписок на store)
 */
interface GroupRendererStaticProps {
  group: GfxPrimitiveGroup
  allGroups: Record<string, GfxPrimitiveGroup>
  primitives: GfxObject['primitives']
  groupAssignments: Record<string, string>
  renderMode: RenderMode
  objectMaterials: GfxObject['materials']
  onPrimitiveClick: (event: any) => void
}

const GroupRendererStatic: React.FC<GroupRendererStaticProps> = ({
  group,
  allGroups,
  primitives,
  groupAssignments,
  renderMode,
  objectMaterials = [],
  onPrimitiveClick
}) => {
  // Находим дочерние группы
  const childGroups = React.useMemo(() => {
    return Object.values(allGroups).filter(g => g.parentGroupUuid === group.uuid)
  }, [allGroups, group.uuid])

  // Находим примитивы этой группы
  const groupPrimitives = React.useMemo(() => {
    return primitives
      .map((primitive, index) => ({ primitive, index }))
      .filter(({ primitive }) => groupAssignments[primitive.uuid] === group.uuid)
  }, [primitives, groupAssignments, group.uuid])

  // Получаем трансформацию группы
  const transform = group.transform

  // Обрабатываем различные форматы координат
  const position = transform?.position ? (
    Array.isArray(transform.position)
      ? [transform.position[0], transform.position[1], transform.position[2]]
      : [transform.position.x, transform.position.y, transform.position.z]
  ) : undefined

  const rotation = transform?.rotation ? (
    Array.isArray(transform.rotation)
      ? [transform.rotation[0], transform.rotation[1], transform.rotation[2]]
      : [transform.rotation.x, transform.rotation.y, transform.rotation.z]
  ) : undefined

  const scale = transform?.scale ? (
    Array.isArray(transform.scale)
      ? [transform.scale[0], transform.scale[1], transform.scale[2]]
      : [transform.scale.x, transform.scale.y, transform.scale.z]
  ) : undefined

  return (
    <group
      visible={group.visible !== false}
      name={group.name}
      userData={{ groupUuid: group.uuid }}
      position={position}
      rotation={rotation}
      scale={scale}
    >
      {/* Рендерим примитивы группы */}
      {groupPrimitives.map(({ primitive, index }) => (
        primitive.visible === false ? null : (
          <PrimitiveRenderer
            key={`${group.uuid}-${primitive.uuid}`}
            primitive={primitive}
            renderMode={renderMode}
            objectMaterials={objectMaterials}
            userData={{ generated: true, primitiveIndex: index, groupUuid: group.uuid }}
            onClick={onPrimitiveClick}
          />
        )
      ))}
      
      {/* Рекурсивно рендерим дочерние группы */}
      {childGroups.map(childGroup => (
        <GroupRendererStatic
          key={childGroup.uuid}
          group={childGroup}
          allGroups={allGroups}
          primitives={primitives}
          groupAssignments={groupAssignments}
          renderMode={renderMode}
          objectMaterials={objectMaterials}
          onPrimitiveClick={onPrimitiveClick}
        />
      ))}
    </group>
  )
}