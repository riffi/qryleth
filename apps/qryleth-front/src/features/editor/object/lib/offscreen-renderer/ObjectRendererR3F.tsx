import React from 'react' 
import { PrimitiveRenderer } from '@/shared/r3f/primitives/PrimitiveRenderer.tsx'
import { paletteRegistry } from '@/shared/lib/palette'
import { GroupRenderer } from '../../ui/renderer/objects/GroupRenderer.tsx'
import { buildGroupTree } from '@/entities/primitiveGroup/model/utils'
import type { RenderMode } from '@/shared/types/ui'
import type { GfxObject } from '@/entities/object'
import { generateTree } from '@/features/editor/object/lib/generators/tree/generateTree'
import type { GfxPrimitiveGroup } from '@/entities/primitiveGroup'
import { InstancedBranches } from '@/shared/r3f/optimization/InstancedBranches'
import { InstancedLeaves } from '@/shared/r3f/optimization/InstancedLeaves'
import { InstancedLeafSpheres } from '@/shared/r3f/optimization/InstancedLeafSpheres'

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
/**
 * Рендерер объекта для оффскрин‑превью.
 *
 * Оптимизация для objectType='tree': даже при одном инстансе используем
 * InstancedMesh (ветви/ствол и листья), чтобы убрать сотни мелких draw calls
 * и обеспечить быструю отрисовку одиночного дерева.
 */
export const ObjectRendererR3F: React.FC<ObjectRendererR3FProps> = ({
  gfxObject,
  renderMode = 'solid'
}) => {
  // Если объект является процедурным деревом — восстанавливаем примитивы детерминированно
  const isTree = gfxObject.objectType === 'tree' && !!gfxObject.treeData?.params
  const primitives = isTree
    ? generateTree({
        ...(gfxObject.treeData!.params as any),
        barkMaterialUuid: gfxObject.treeData!.barkMaterialUuid,
        leafMaterialUuid: gfxObject.treeData!.leafMaterialUuid
      })
    : gfxObject.primitives
  const primitiveGroups = gfxObject.primitiveGroups ?? {}
  const primitiveGroupAssignments = gfxObject.primitiveGroupAssignments ?? {}
  const materials = gfxObject.materials ?? []

  // Признак дерева по типу или по наличию tree‑примитивов
  const isTreeObject = gfxObject.objectType === 'tree' || primitives?.some(p => (p as any).type === 'trunk' || (p as any).type === 'branch' || (p as any).type === 'leaf')

  // Для instanced‑компонентов подготовим scene/instance‑заглушки
  const sceneLike = React.useMemo(() => ({
    // передаём минимально необходимое: uuid, имя, материалы, treeData, layerId
    ...gfxObject,
    layerId: 'objects',
    visible: true,
  }) as any, [gfxObject])

  const singleInstance = React.useMemo(() => ({
    uuid: 'preview-instance',
    objectUuid: gfxObject.uuid,
    visible: true,
    transform: { position: [0,0,0], rotation: [0,0,0], scale: [1,1,1] }
  }), [gfxObject.uuid])

  // Классифицируем примитивы дерева: цилиндры (ствол/ветви), листья, остальные
  const treeBuckets = React.useMemo(() => {
    if (!isTreeObject) return null
    const cylinders: { primitive: any; index: number }[] = []
    const leaves: { primitive: any; index: number }[] = []
    const rest: { primitive: any; index: number }[] = []
    ;(primitives || []).forEach((p, idx) => {
      const t = (p as any).type
      if (t === 'trunk' || t === 'branch') cylinders.push({ primitive: p, index: idx })
      else if (t === 'leaf') leaves.push({ primitive: p, index: idx })
      else rest.push({ primitive: p, index: idx })
    })
    return { cylinders, leaves, rest }
  }, [isTreeObject, primitives])

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
      {isTreeObject && treeBuckets ? (
        <>
          {/* Instanced ветви/ствол */}
          {treeBuckets.cylinders.length > 0 && (
            <InstancedBranches
              sceneObject={sceneLike}
              cylinders={treeBuckets.cylinders as any}
              instances={[singleInstance] as any}
              materials={materials}
              onClick={handleObjectClick}
            />
          )}

          {/* Instanced листья (биллборды/текстуры/кресты) */}
          {treeBuckets.leaves.length > 0 && (
            <InstancedLeaves
              sceneObject={sceneLike}
              spheres={treeBuckets.leaves as any}
              instances={[singleInstance] as any}
              materials={materials}
              onClick={handleObjectClick}
            />
          )}

          {/* Сферические листья, если используются */}
          {treeBuckets.leaves.length > 0 && (
            <InstancedLeafSpheres
              sceneObject={sceneLike}
              leaves={treeBuckets.leaves as any}
              instances={[singleInstance] as any}
              materials={materials}
              onClick={handleObjectClick}
            />
          )}

          {/* Прочие примитивы дерева, если такие есть */}
          {treeBuckets.rest.map(({ primitive, index }) => (
            (primitive as any).visible === false ? null : (
              <PrimitiveRenderer
                key={`root-${(primitive as any).uuid || index}`}
                primitive={primitive as any}
                renderMode={renderMode}
                objectMaterials={materials}
                activePalette={paletteRegistry.get('default') as any}
                userData={{ generated: true, primitiveIndex: index }}
                onClick={handleObjectClick}
              />
            )
          ))}
        </>
      ) : (
        <>
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
            primitiveGroupAssignments[(primitive as any).uuid] || (primitive as any).visible === false ? null : (
              <PrimitiveRenderer
                key={`root-${(primitive as any).uuid}`}
                primitive={primitive as any}
                renderMode={renderMode}
                objectMaterials={materials}
                activePalette={paletteRegistry.get('default') as any}
                userData={{ generated: true, primitiveIndex: index }}
                onClick={handleObjectClick}
              />
            )
          ))}
        </>
      )}
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
