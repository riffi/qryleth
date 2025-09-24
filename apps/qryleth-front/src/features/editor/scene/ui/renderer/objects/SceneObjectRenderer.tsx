import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PrimitiveRenderer } from '@/shared/r3f/primitives/PrimitiveRenderer.tsx'
import { SceneGroupRenderer } from './SceneGroupRenderer.tsx'
import { useRenderMode } from '../../../model/sceneStore.ts'
import { useSceneStore } from '../../../model/sceneStore.ts'
import { paletteRegistry } from '@/shared/lib/palette'
import type {SceneObject, SceneObjectInstance} from "@/entities/scene/types.ts";
import { InstancedLeaves } from '@/shared/r3f/optimization/InstancedLeaves'
import { InstancedLeafSpheres } from '@/shared/r3f/optimization/InstancedLeafSpheres'
import { useSingleTreeLod, defaultTreeLodConfig } from '@/shared/r3f/optimization/treeLod'
import { SCENE_CHUNKED_LEAVES_ENABLED } from '@/shared/r3f/optimization/flags'
import type {
  ObjectTransformEvent,
  RenderMode,
  SceneClickEvent,
  SceneHoverEvent
} from '@/shared/types/ui'

export interface SceneObjectRendererProps {
  sceneObject: SceneObject
  instance: SceneObjectInstance
  instanceIndex: number
  isSelected?: boolean
  isHovered?: boolean
  renderMode?: RenderMode
  visible?: boolean
  onClick?: (event: SceneClickEvent) => void
  onHover?: (event: SceneHoverEvent) => void
}

// ВАЖНО: глобально отключаем рендер листвы внутри объекта, т.к. вводится
// сценовый агрегатор ChunkedInstancedLeaves с сегментацией по чанкам (фрустум‑куллинг по чанку).
// Флаг берётся из общего файла optimization/flags.

export const SceneObjectRenderer: React.FC<SceneObjectRendererProps> = ({
  sceneObject,
  instance,
  instanceIndex,
  isSelected = false,
  isHovered = false,
  onClick,
  onHover,
  visible = true
}) => {
  const groupRef = useRef<THREE.Group>(null)
  const renderMode = useRenderMode()
  const environmentContent = useSceneStore(s => s.environmentContent)
  const paletteUuid = environmentContent?.paletteUuid || 'default'
  const activePalette = paletteRegistry.get(paletteUuid) || paletteRegistry.get('default')

  const handleClick = (event: any) => {
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

  const handlePointerOver = (event: any) => {
    event.stopPropagation()
    if (onHover) {
      onHover({
        objectUuid: instance.objectUuid,
        instanceId: instance.uuid,
        objectInstanceIndex: instanceIndex,
        object: event.object
      })
    }
  }

  const handlePointerOut = (event: any) => {
    event.stopPropagation()
    // Clear hover - this could be handled by parent component
  }


  // Проверяем есть ли группы в объекте
  const hasGroups = sceneObject.primitiveGroups && Object.keys(sceneObject.primitiveGroups).length > 0
  const assignments = sceneObject.primitiveGroupAssignments || {}

  // Получаем корневые группы (без parentGroupUuid)
  const rootGroups = hasGroups
    ? Object.values(sceneObject.primitiveGroups!).filter(group => !group.parentGroupUuid)
    : []

  // Получаем примитивы, не привязанные ни к одной группе
  const ungroupedPrimitives = sceneObject.primitives?.map((primitive, index) => ({ primitive, index }))
    .filter(({ primitive }) => !assignments[primitive.uuid]) || []

  /**
   * Оптимизированный рендер одиночного дерева.
   * Детальная мотивация: дерево состоит из множества примитивов (ветви/листья),
   * и рендер каждого отдельного `mesh` создаёт большое число draw calls.
   * Даже при единственном инстансе объекта выгодно объединить их в InstancedMesh,
   */
  const isTreeObject = sceneObject.objectType === 'tree' || sceneObject.primitives?.some(p => p.type === 'leaf' || (p as any).type === 'mesh')

  // Ленивая классификация примитивов дерева: ветви/ствол, листья, прочее
  const treeBuckets = useMemo(() => {
    if (!isTreeObject) return null
    const cylinders: { primitive: any; index: number }[] = []
    const leaves: { primitive: any; index: number }[] = []
    const rest: { primitive: any; index: number }[] = []
    sceneObject.primitives?.forEach((p, idx) => {
      if (p.type === 'trunk' || p.type === 'branch') cylinders.push({ primitive: p, index: idx })
      else if (p.type === 'leaf') leaves.push({ primitive: p, index: idx })
      else rest.push({ primitive: p, index: idx })
    })
    return { cylinders, leaves, rest }
  }, [isTreeObject, sceneObject.primitives])

  // Единая логика LOD и константы: общий хук
  const { isFar: lodFar, leafSampleRatio, leafScaleMul} = useSingleTreeLod(groupRef, defaultTreeLodConfig)

  return (
    <group
      ref={groupRef}
      name={sceneObject.name}
      position={instance.transform?.position || [0, 0, 0]}
      rotation={instance.transform?.rotation || [0, 0, 0]}
      scale={instance.transform?.scale || [1, 1, 1]}
      visible={visible}
      userData={{
        generated: true,
        objectUuid: instance.objectUuid,
        objectInstanceUuid: instance.uuid,
        layerId: sceneObject.layerId || 'objects'
      }}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/**
       * ВАЖНО (позиционирование одиночных деревьев в SceneEditor):
       *
       * инстансов и внутри себя ПРИМЕНЯЮТ трансформации каждого инстанса (позиция/поворот/масштаб)
       * к матрицам instancedMesh. В SceneObjectRenderer эти компоненты рендерятся ВНУТРИ <group>,
       * на который уже выставлены трансформации текущего инстанса объекта (position/rotation/scale).
       * Если передать в instanced‑компоненты исходный инстанс ещё раз, трансформация будет
       * применена ДВАЖДЫ (на группе и в instancedMesh), что приводит к смещению/искажению.
       *
       * Чтобы избежать двойного применения, передаём в instanced‑компоненты «нормализованный»
       * инстанс с единичной трансформацией (0/0/0, 0/0/0, 1/1/1). Локальные смещения самих
       * примитивов (ствола, ветвей, листьев) сохраняются и рендерятся корректно в координатах
       * группы — то есть относительно единожды применённой трансформации выбранного инстанса.
       */}
      {(() => {
        const normalizedInstance = {
          ...instance,
          transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] as [number, number, number] },
        }
        // Единые параметры LOD + кросс‑фейд
        const { isFar: lodFar, lodBlend, leafSampleRatio, leafScaleMul} = useSingleTreeLod(groupRef, defaultTreeLodConfig)
        const nearAlpha = 1 - lodBlend
        const farAlpha = lodBlend
        const blending = lodBlend > 0.001 && lodBlend < 0.999
        return (
          <>
            {/* Ветвление: дерево — через инстансированные меши; прочее — стандартный путь */}
            {isTreeObject && treeBuckets ? (
              <>
                {(() => {
                  return (
                    <>
                      {/* Near LOD — полная модель, с кросс‑фейдом */}

                      {treeBuckets.leaves.length > 0 && !SCENE_CHUNKED_LEAVES_ENABLED && (
                        <InstancedLeaves
                          sceneObject={sceneObject}
                          spheres={treeBuckets.leaves as any}
                          instances={[normalizedInstance]}
                          materials={sceneObject.materials}
                          opacity={nearAlpha}
                          depthWrite={!blending}
                          onClick={(e) => onClick?.({ objectUuid: instance.objectUuid, instanceId: instance.uuid, point: (e as any).point, object: (e as any).object })}
                          onHover={(e) => onHover?.({ objectUuid: instance.objectUuid, instanceId: instance.uuid, objectInstanceIndex: instanceIndex, object: (e as any).object })}
                        />
                      )}
                      {treeBuckets.leaves.length > 0 && !SCENE_CHUNKED_LEAVES_ENABLED && (
                        <InstancedLeafSpheres
                          sceneObject={sceneObject}
                          leaves={treeBuckets.leaves as any}
                          instances={[normalizedInstance]}
                          materials={sceneObject.materials}
                          opacity={nearAlpha}
                          depthWrite={!blending}
                          onClick={(e) => onClick?.({ objectUuid: instance.objectUuid, instanceId: instance.uuid, point: (e as any).point, object: (e as any).object })}
                          onHover={(e) => onHover?.({ objectUuid: instance.objectUuid, instanceId: instance.uuid, objectInstanceIndex: instanceIndex, object: (e as any).object })}
                        />
                      )}

                      {/* Far LOD — только ствол + редуцированные и крупнее листья, с кросс‑фейдом */}

                      {treeBuckets.leaves.length > 0 && !SCENE_CHUNKED_LEAVES_ENABLED && (
                        <InstancedLeaves
                          sceneObject={sceneObject}
                          spheres={treeBuckets.leaves as any}
                          instances={[normalizedInstance]}
                          materials={sceneObject.materials}
                          sampleRatio={leafSampleRatio}
                          scaleMul={leafScaleMul}
                          opacity={farAlpha}
                          depthWrite={!blending}
                          onClick={(e) => onClick?.({ objectUuid: instance.objectUuid, instanceId: instance.uuid, point: (e as any).point, object: (e as any).object })}
                          onHover={(e) => onHover?.({ objectUuid: instance.objectUuid, instanceId: instance.uuid, objectInstanceIndex: instanceIndex, object: (e as any).object })}
                        />
                      )}
                      {treeBuckets.leaves.length > 0 && !SCENE_CHUNKED_LEAVES_ENABLED && (
                        <InstancedLeafSpheres
                          sceneObject={sceneObject}
                          leaves={treeBuckets.leaves as any}
                          instances={[normalizedInstance]}
                          materials={sceneObject.materials}
                          sampleRatio={leafSampleRatio}
                          scaleMul={leafScaleMul}
                          opacity={farAlpha}
                          depthWrite={!blending}
                          onClick={(e) => onClick?.({ objectUuid: instance.objectUuid, instanceId: instance.uuid, point: (e as any).point, object: (e as any).object })}
                          onHover={(e) => onHover?.({ objectUuid: instance.objectUuid, instanceId: instance.uuid, objectInstanceIndex: instanceIndex, object: (e as any).object })}
                        />
                      )}
                    </>
                  )
                })()}

                {treeBuckets.rest.map(({ primitive, index }) => (
                  <PrimitiveRenderer
                    key={primitive.uuid || index}
                    primitive={primitive}
                    renderMode={renderMode}
                    objectMaterials={sceneObject.materials}
                    activePalette={activePalette as any}
                    userData={{
                      generated: true,
                      primitiveIndex: index,
                      objectUuid: instance.objectUuid,
                      objectInstanceUuid: instance.uuid,
                      layerId: sceneObject.layerId || 'objects'
                    }}
                    onClick={handleClick}
                  />
                ))}
              </>
            ) : (
              <>
                {/* Рендеринг корневых групп */}
                {rootGroups.map(group => (
                  <SceneGroupRenderer
                    key={group.uuid}
                    groupUuid={group.uuid}
                    groupName={group.name}
                    sceneObject={sceneObject}
                    instance={instance}
                    renderMode={renderMode}
                    onClick={onClick}
                  />
                ))}

                {/* Рендеринг примитивов без группы (обратная совместимость) */}
                {ungroupedPrimitives.map(({ primitive, index }) => (
                  <PrimitiveRenderer
                    key={primitive.uuid || index}
                    primitive={primitive}
                    renderMode={renderMode}
                    objectMaterials={sceneObject.materials}
                    activePalette={activePalette as any}
                    userData={{
                      generated: true,
                      primitiveIndex: index,
                      objectUuid: instance.objectUuid,
                      objectInstanceUuid: instance.uuid,
                      layerId: sceneObject.layerId || 'objects'
                    }}
                    onClick={handleClick}
                  />
                ))}
              </>
            )}
          </>
        )
      })()}
    </group>
  )
}


