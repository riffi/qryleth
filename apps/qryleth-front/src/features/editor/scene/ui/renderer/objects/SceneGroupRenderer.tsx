import React from 'react'
import {PrimitiveRenderer} from '@/shared/r3f/primitives/PrimitiveRenderer.tsx'
import type {RenderMode, SceneClickEvent} from '@/shared/types/ui'
import type {SceneObject, SceneObjectInstance} from '@/entities/scene/types'
import type {ThreeEvent} from '@react-three/fiber'

export interface SceneGroupRendererProps {
  /** UUID группы, которую нужно отрисовать */
  groupUuid: string
  /** Объект сцены */
  sceneObject: SceneObject
  /** Экземпляр объекта */
  instance: SceneObjectInstance
  /** Режим рендеринга примитивов */
  renderMode: RenderMode
  /** Обработчик клика по примитиву в сцене */
  onClick?: (event: SceneClickEvent) => void
  /** Имя группы для отладки */
  groupName?: string
}

/**
 * Рекурсивно отображает группу примитивов в контексте сцен-редактора,
 * обеспечивая правильную передачу scene context в userData и обработку кликов
 */
export const SceneGroupRenderer: React.FC<SceneGroupRendererProps> = ({
  groupUuid,
  sceneObject,
  instance,
  renderMode,
  onClick,
  groupName
}) => {
  const groups = sceneObject.primitiveGroups || {}
  const assignments = sceneObject.primitiveGroupAssignments || {}
  const group = groups[groupUuid]

  if (!group) {
    console.warn(`SceneGroupRenderer: Group ${groupUuid} not found`)
    return null
  }

  // Получаем дочерние группы
  const childGroups = Object.values(groups).filter(g => g.parentGroupUuid === groupUuid)
  
  // Получаем примитивы этой группы
  const groupPrimitives = sceneObject.primitives
    ?.map((primitive, index) => ({ primitive, index }))
    .filter(({ primitive }) => assignments[primitive.uuid] === groupUuid) || []

  // Проверяем видимость группы
  const isVisible = group.visible !== false

  const handlePrimitiveClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (onClick) {
      onClick({
        objectUuid: instance.objectUuid,
        instanceId: instance.uuid,
        point: event.point,
        object: event.object
      })
    }
  }

  // Используем трансформацию группы если есть
  const position = group.transform?.position ? (
    Array.isArray(group.transform.position)
      ? [group.transform.position[0], group.transform.position[1], group.transform.position[2]]
      : [group.transform.position.x, group.transform.position.y, group.transform.position.z]
  ) : undefined

  const rotation = group.transform?.rotation ? (
    Array.isArray(group.transform.rotation)
      ? [group.transform.rotation[0], group.transform.rotation[1], group.transform.rotation[2]]
      : [group.transform.rotation.x, group.transform.rotation.y, group.transform.rotation.z]
  ) : undefined

  const scale = group.transform?.scale ? (
    Array.isArray(group.transform.scale)
      ? [group.transform.scale[0], group.transform.scale[1], group.transform.scale[2]]
      : [group.transform.scale.x, group.transform.scale.y, group.transform.scale.z]
  ) : undefined

  return (
    <group
      visible={isVisible}
      name={groupName || group.name}
      userData={{
        generated: true,
        groupUuid,
        objectUuid: instance.objectUuid,
        objectInstanceUuid: instance.uuid,
        layerId: sceneObject.layerId || 'objects'
      }}
      position={position}
      rotation={rotation}
      scale={scale}
    >
      {groupPrimitives.map(({ primitive, index }) => (
        primitive.visible === false ? null : (
          <PrimitiveRenderer
            key={`${groupUuid}-${primitive.uuid}`}
            primitive={primitive}
            renderMode={renderMode}
            objectMaterials={sceneObject.materials}
            userData={{
              generated: true,
              primitiveIndex: index,
              groupUuid,
              objectUuid: instance.objectUuid,
              objectInstanceUuid: instance.uuid,
              layerId: sceneObject.layerId || 'objects'
            }}
            onClick={handlePrimitiveClick}
          />
        )
      ))}
      {childGroups.map(childGroup => (
        <SceneGroupRenderer
          key={childGroup.uuid}
          groupUuid={childGroup.uuid}
          groupName={childGroup.name}
          sceneObject={sceneObject}
          instance={instance}
          renderMode={renderMode}
          onClick={onClick}
        />
      ))}
    </group>
  )
}