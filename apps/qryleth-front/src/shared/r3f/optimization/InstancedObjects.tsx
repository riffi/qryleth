import React, { useMemo, useRef, useCallback } from 'react'
import { Instances, Instance } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SceneObject, SceneObjectInstance, SceneLayer } from '@/entities/scene/types'
import { GfxLayerType } from '@/entities/layer'
import { useInstancedTransformOverrides } from '@/shared/r3f/optimization/InstancedTransformContext'
import { InstancedBranches } from '@/shared/r3f/optimization/InstancedBranches'
import { InstancedLeaves } from '@/shared/r3f/optimization/InstancedLeaves'
import { InstancedLeafSpheres } from '@/shared/r3f/optimization/InstancedLeafSpheres'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import { paletteRegistry } from '@/shared/lib/palette'
import { resolveMaterial, materialToThreePropsWithPalette } from '@/shared/lib/materials'

// Component for rendering primitives in Instances
const PrimitiveGeometry: React.FC<{ primitive: any }> = ({ primitive }) => {
  const { type, geometry } = primitive

  switch (type) {
    case 'box':
      return (
        <boxGeometry
          args={[
            geometry.width || 1,
            geometry.height || 1,
            geometry.depth || 1
          ]}
        />
      )

    case 'sphere':
      return (
        <sphereGeometry
          args={[
            geometry.radius || 0.5,
            32, 32
          ]}
        />
      )

    case 'cylinder':
      return (
        <cylinderGeometry
          args={[
            geometry.radiusTop || 0.5,
            geometry.radiusBottom || 0.5,
            geometry.height || 1,
            32
          ]}
        />
      )

    case 'cone':
      return (
        <coneGeometry
          args={[
            geometry.radius || 0.5,
            geometry.height || 1,
            32
          ]}
        />
      )

    case 'pyramid':
      return (
        <coneGeometry
          args={[
            geometry.baseSize || 0.5,
            geometry.height || 1,
            4 // 4 sides for pyramid
          ]}
        />
      )

    case 'plane':
      return (
        <planeGeometry
          args={[
            geometry.width || 1,
            geometry.height || 1
          ]}
        />
      )

    default:
      return <boxGeometry args={[1, 1, 1]} />
  }
}

// Component for rendering materials in Instances
interface PrimitiveMaterialProps {
  primitive: any
  materials?: any[]
}
const PrimitiveMaterial: React.FC<PrimitiveMaterialProps> = ({ primitive, materials }) => {
  // Читаем активную палитру сцены → реактивно перерисовываем материал при её смене
  const paletteUuid = useSceneStore(s => s.environmentContent?.paletteUuid || 'default')
  const activePalette = paletteRegistry.get(paletteUuid) || paletteRegistry.get('default')

  // Унифицированный резолв материала как в PrimitiveRenderer
  const resolved = resolveMaterial({
    directMaterial: primitive.material,
    objectMaterialUuid: primitive.objectMaterialUuid,
    globalMaterialUuid: primitive.globalMaterialUuid,
    objectMaterials: materials,
  })
  const threeProps = materialToThreePropsWithPalette(resolved, activePalette as any)
  return <meshStandardMaterial {...threeProps} />
}

/**
 * Комбинирует трансформации инстанса и примитива корректно для иерархии
 * (primitive как дочерний узел instance), чтобы при повороте инстанса
 * примитивы вращались вокруг центра инстанса.
 *
 * Правильная формула для позиции дочернего узла в three.js:
 * worldPos = instance.pos + R(instance) * ( S(instance) * primitive.pos )
 *
 * - Поворот: кватернионы комбинируются умножением: Qfinal = Qinst * Qprim
 * - Масштаб: покомпонентно: Sfinal = Sinst ⊙ Sprim
 */
const combineTransforms = (
  instanceTransform: { position?: number[], rotation?: number[], scale?: number[] },
  primitiveTransform: { position?: number[], rotation?: number[], scale?: number[] }
): { position: [number, number, number], rotation: [number, number, number], scale: [number, number, number] } => {
  // Инстанс
  const [ix, iy, iz] = instanceTransform.position || [0, 0, 0]
  const [irx, iry, irz] = instanceTransform.rotation || [0, 0, 0]
  const [isx, isy, isz] = instanceTransform.scale || [1, 1, 1]

  // Примитив
  const [px, py, pz] = primitiveTransform.position || [0, 0, 0]
  const [prx, pry, prz] = primitiveTransform.rotation || [0, 0, 0]
  const [psx, psy, psz] = primitiveTransform.scale || [1, 1, 1]

  // Кватернионы поворота
  const qInst = new THREE.Quaternion().setFromEuler(new THREE.Euler(irx, iry, irz, 'XYZ'))
  const qPrim = new THREE.Quaternion().setFromEuler(new THREE.Euler(prx, pry, prz, 'XYZ'))
  const qFinal = new THREE.Quaternion().copy(qInst).multiply(qPrim)

  // Позиция: сначала масштабируем локальный сдвиг примитива масштабом инстанса,
  // затем поворачиваем этим же поворотом инстанса, и только после — переносим
  // в позицию инстанса. Это даёт вращение примитивов вокруг центра инстанса.
  const vLocal = new THREE.Vector3(px, py, pz)
  vLocal.multiply(new THREE.Vector3(isx, isy, isz))
  vLocal.applyQuaternion(qInst)
  vLocal.add(new THREE.Vector3(ix, iy, iz))

  const finalPosition: [number, number, number] = [vLocal.x, vLocal.y, vLocal.z]

  // Итоговый поворот — композиция поворотов
  const eFinal = new THREE.Euler().setFromQuaternion(qFinal, 'XYZ')
  const finalRotation: [number, number, number] = [eFinal.x, eFinal.y, eFinal.z]

  // Итоговый масштаб — помножение компонент
  const finalScale: [number, number, number] = [
    isx * psx,
    isy * psy,
    isz * psz
  ]

  return { position: finalPosition, rotation: finalRotation, scale: finalScale }
}

interface InstancedObjectsProps {
  /** Список объектов сцены */
  objects: SceneObject[]
  /** Экземпляры объектов */
  instances: SceneObjectInstance[]
  /** Слои сцены */
  layers: SceneLayer[]
  /** Минимальное количество экземпляров для оптимизации */
  minimumInstancesForOptimization?: number
  /** Обработчик клика */
  onClick?: (event: any) => void
  /** Обработчик ховера */
  onHover?: (event: any) => void
}

export const InstancedObjects: React.FC<InstancedObjectsProps> = ({
  objects,
  instances,
  layers,
  minimumInstancesForOptimization = 3,
  onClick,
  onHover
}) => {
  const instanceCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    instances.forEach((inst) => {
      counts[inst.objectUuid] = (counts[inst.objectUuid] || 0) + 1
    })
    return counts
  }, [instances])

  // Helper function to check if instance is visible
  const isInstanceVisible = (instance: SceneObjectInstance, objectUuid: string) => {
    const sceneObject = objects.find(obj => obj.uuid === objectUuid)
    if (!sceneObject) return false

    // Check layer visibility
    const layerId = sceneObject.layerId || 'objects'
    const layer = layers.find(l => l.id === layerId)
    const isLayerVisible = layer ? layer.visible : true

    // Check object visibility
    const isObjectVisible = sceneObject.visible !== false

    // Check instance visibility
    const isInstanceVisibleFlag = instance.visible !== false

    return isLayerVisible && isObjectVisible && isInstanceVisibleFlag
  }

  // Group object instances by object type for instancing
  const instanceGroups = useMemo(() => {
    const groups: { [objectUuid: string]: SceneObjectInstance[] } = {}

    instances.forEach(instance => {
      if (!groups[instance.objectUuid]) {
        groups[instance.objectUuid] = []
      }
      groups[instance.objectUuid].push(instance)
    })

    // Only include objects with enough instances for optimization
    const optimizedGroups: { [objectUuid: string]: SceneObjectInstance[] } = {}
    Object.entries(groups).forEach(([objectUuid, objInstances]) => {
      if (objInstances.length >= minimumInstancesForOptimization) {
        optimizedGroups[objectUuid] = objInstances
      }
    })

    return optimizedGroups
  }, [instances, minimumInstancesForOptimization])

  const renderInstancedGroup = (objectUuid: string, instancesGroup: SceneObjectInstance[]) => {
    const sceneObject = objects.find(obj => obj.uuid === objectUuid)
    if (!sceneObject || sceneObject.primitives.length === 0) return null

    // Filter visible instances
    const visibleInstances = instancesGroup.filter(instance => isInstanceVisible(instance, objectUuid))
    if (visibleInstances.length === 0) return null

    return (
      <CompositeInstancedGroup
        key={`instanced-${objectUuid}`}
        objectUuid={objectUuid}
        sceneObject={sceneObject}
        instances={visibleInstances}
        onClick={onClick}
        onHover={onHover}
      />
    )
  }

  if (Object.keys(instanceGroups).length === 0) return null

  return (
    <>
      {Object.entries(instanceGroups).map(([objectUuid, instancesGroup]) =>
        renderInstancedGroup(objectUuid, instancesGroup)
      )}
    </>
  )
}

// Component for handling composite instanced group with multiple primitives
interface CompositeInstancedGroupProps {
  objectUuid: string
  sceneObject: SceneObject
  instances: SceneObjectInstance[]
  onClick?: (event: any) => void
  onHover?: (event: any) => void
}

const CompositeInstancedGroup: React.FC<CompositeInstancedGroupProps> = ({
  objectUuid,
  sceneObject,
  instances,
  onClick,
  onHover
}) => {
  // Попытка объединить все цилиндры (ветви/ствол) в один InstancedMesh с шейдером сужения
  const cylinders: { primitive: any; index: number }[] = []
  const spheres: { primitive: any; index: number }[] = []
  const rest: { primitive: any; index: number }[] = []
  sceneObject.primitives.forEach((p, idx) => {
    if (p.type === 'trunk' || p.type === 'branch') cylinders.push({ primitive: p, index: idx })
    else if (p.type === 'leaf') spheres.push({ primitive: p, index: idx })
    else rest.push({ primitive: p, index: idx })
  })

  return (
    <group>
      {cylinders.length > 0 && (
        <InstancedBranches
          sceneObject={sceneObject}
          cylinders={cylinders}
          instances={instances}
          materials={sceneObject.materials}
          onClick={onClick}
          onHover={onHover}
        />
      )}

      {spheres.length > 0 && (
        <>
          <InstancedLeaves
            sceneObject={sceneObject}
            spheres={spheres}
            instances={instances}
            materials={sceneObject.materials}
            onClick={onClick}
            onHover={onHover}
          />
          <InstancedLeafSpheres
            sceneObject={sceneObject}
            leaves={spheres as any}
            instances={instances}
            materials={sceneObject.materials}
            onClick={onClick}
            onHover={onHover}
          />
        </>
      )}

      {rest.map(({ primitive, index }) => (
        <PrimitiveInstancedGroup
          key={`${objectUuid}-primitive-${index}`}
          objectUuid={objectUuid}
          sceneObject={sceneObject}
          primitive={primitive}
          primitiveIndex={index}
          instances={instances}
          onClick={onClick}
          onHover={onHover}
          materials={sceneObject.materials}
        />
      ))}
    </group>
  )
}

// Component for handling a single primitive with instancing
interface PrimitiveInstancedGroupProps {
  objectUuid: string
  sceneObject: SceneObject
  primitive: any
  primitiveIndex: number
  instances: SceneObjectInstance[]
  onClick?: (event: any) => void
  onHover?: (event: any) => void
  materials?: any[]
}

const PrimitiveInstancedGroup: React.FC<PrimitiveInstancedGroupProps> = ({
  objectUuid,
  sceneObject,
  primitive,
  primitiveIndex,
  instances,
  onClick,
  onHover,
  materials
}) => {
  const ref = useRef<THREE.InstancedMesh>(null)
  // Локальные (контекстные) переопределения трансформаций для realtime-отклика gizmo
  const { overrides } = useInstancedTransformOverrides()

  const handleInstanceClick = useCallback((event: any) => {
    if (!onClick || !ref.current) return

    // Get the instanceId from the event
    const instanceId = event.instanceId
    if (instanceId !== undefined && instanceId < instances.length) {
      const instance = instances[instanceId]
      const syntheticEvent = {
        ...event,
        object: event.object,
        userData: {
          generated: true,
          objectUuid: objectUuid,
          objectInstanceUuid: instance.uuid,
          isInstanced: true,
          instanceId: instanceId,
          layerId: sceneObject.layerId || 'objects'
        }
      }
      onClick(syntheticEvent)
    }
  }, [onClick, objectUuid, instances, sceneObject])

  const handleInstanceHover = useCallback((event: any) => {
    if (!onHover || !ref.current) return

    const instanceId = event.instanceId
    if (instanceId !== undefined && instanceId < instances.length) {
      const instance = instances[instanceId]
      const syntheticEvent = {
        ...event,
        object: event.object,
        userData: {
          generated: true,
          objectUuid: objectUuid,
          objectInstanceUuid: instance.uuid,
          isInstanced: true,
          instanceId: instanceId,
          layerId: sceneObject.layerId || 'objects'
        }
      }
      onHover(syntheticEvent)
    }
  }, [onHover, objectUuid, instances, sceneObject])

  return (
    <Instances
      limit={1000} // Maximum instances
      range={instances.length}
      ref={ref}
      // ВАЖНО: по умолчанию Three.js отключает тени для мешей (castShadow=false).
      // Для InstancedMesh это также справедливо, поэтому явно включаем отбрасывание теней,
      // чтобы инстансы объектов корректно отбрасывали тени на ландшафтные слои (receiveShadow у террейна уже включён).
      castShadow
      receiveShadow
      onClick={handleInstanceClick}
      onPointerOver={handleInstanceHover}
    >
      <PrimitiveGeometry primitive={primitive} />
      <PrimitiveMaterial primitive={primitive} materials={materials || sceneObject.materials} />

      {instances.map((instance, index) => {
        // Combine instance and primitive transforms
        const sourceTransform = overrides[instance.uuid] || (instance.transform || {})
        const finalTransform = combineTransforms(
          sourceTransform,
          primitive.transform || {}
        )

        return (
          <Instance
            key={`instance-${objectUuid}-${primitiveIndex}-${index}`}
            position={finalTransform.position}
            rotation={finalTransform.rotation}
            scale={finalTransform.scale}
            visible={true}
            userData={{
              generated: true,
              objectUuid: objectUuid,
              objectInstanceUuid: instance.uuid,
              isInstanced: true,
              instanceId: index,
              layerId: sceneObject.layerId || 'objects'
            }}
          />
        )
      })}
    </Instances>
  )
}

// Hook to check if an object should use instancing
export const useInstanceOptimization = (
  objectUuid: string,
  instanceCounts: Record<string, number>,
  minimumInstances = 3
): boolean => {
  return (instanceCounts[objectUuid] || 0) >= minimumInstances
}

// Component for conditionally rendering instances vs individual objects
interface ConditionalInstancedObjectProps {
  objectUuid: string
  instance: SceneObjectInstance
  instanceIndex: number
  minimumInstancesForOptimization?: number
  objects: SceneObject[]
  layers: SceneLayer[]
  instanceCounts: Record<string, number>
  children: React.ReactNode
}

export const ConditionalInstancedObject: React.FC<ConditionalInstancedObjectProps> = ({
  objectUuid,
  instance,
  instanceIndex,
  minimumInstancesForOptimization = 3,
  children,
  objects,
  layers,
  instanceCounts
}) => {
  const shouldUseInstancing = useInstanceOptimization(
    objectUuid,
    instanceCounts,
    minimumInstancesForOptimization
  )

  // If this object should use instancing, don't render individual instance
  // It will be handled by InstancedObjects component
  if (shouldUseInstancing) {
    return null
  }

  // Check complete visibility (layer, object, instance)
  const sceneObject = objects.find(obj => obj.uuid === objectUuid)
  if (!sceneObject) return null

  const layerId = sceneObject.layerId || 'objects'
  const layer = layers.find(l => l.id === layerId)
  const isLayerVisible = layer ? layer.visible : true
  const isObjectVisible = sceneObject.visible !== false
  const isInstanceVisibleFlag = instance.visible !== false

  const isCompletelyVisible = isLayerVisible && isObjectVisible && isInstanceVisibleFlag

  if (!isCompletelyVisible) {
    return null
  }

  // Otherwise render as individual object
  return <>{children}</>
}

// Test component for instanced mesh
export const TestInstancedMesh: React.FC = () => {
  const testObjects: SceneObject[] = [
    {
      uuid: 'test-table-object',
      name: 'Test Table',
      primitives: [
        // Столешница
        {
          uuid: 'table-top',
          type: 'box',
          name: 'Table Top',
          geometry: {
            width: 2,
            height: 0.1,
            depth: 1
          },
          material: {
            color: '#8B4513' // Коричневый цвет дерева
          },
          transform: {
            position: [0, 0.5, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          }
        },
        // Ножка 1
        {
          uuid: 'table-leg-1',
          type: 'cylinder',
          name: 'Table Leg 1',
          geometry: {
            radiusTop: 0.05,
            radiusBottom: 0.05,
            height: 1
          },
          material: {
            color: '#654321' // Темно-коричневый
          },
          transform: {
            position: [0.8, 0, 0.4],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          }
        },
        // Ножка 2
        {
          uuid: 'table-leg-2',
          type: 'cylinder',
          name: 'Table Leg 2',
          geometry: {
            radiusTop: 0.05,
            radiusBottom: 0.05,
            height: 1
          },
          material: {
            color: '#654321' // Темно-коричневый
          },
          transform: {
            position: [-0.8, 0, 0.4],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          }
        },
        // Ножка 3
        {
          uuid: 'table-leg-3',
          type: 'cylinder',
          name: 'Table Leg 3',
          geometry: {
            radiusTop: 0.05,
            radiusBottom: 0.05,
            height: 1
          },
          material: {
            color: '#654321' // Темно-коричневый
          },
          transform: {
            position: [0.8, 0, -0.4],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          }
        },
        // Ножка 4
        {
          uuid: 'table-leg-4',
          type: 'cylinder',
          name: 'Table Leg 4',
          geometry: {
            radiusTop: 0.05,
            radiusBottom: 0.05,
            height: 1
          },
          material: {
            color: '#654321' // Темно-коричневый
          },
          transform: {
            position: [-0.8, 0, -0.4],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          }
        }
      ],
      visible: true
    }
  ]

  const testInstances: SceneObjectInstance[] = Array.from({ length: 8 }, (_, i) => ({
    uuid: `test-table-instance-${i}`,
    objectUuid: 'test-table-object',
    transform: {
      position: [i * 4, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    },
    visible: true
  }))

  const testLayers: SceneLayer[] = [
    {
      id: 'objects',
      name: 'Объекты',
      type: GfxLayerType.Object,
      visible: true,
      position: 0
    }
  ]

  return (
    <InstancedObjects
      objects={testObjects}
      instances={testInstances}
      layers={testLayers}
      minimumInstancesForOptimization={3}
    />
  )
}

