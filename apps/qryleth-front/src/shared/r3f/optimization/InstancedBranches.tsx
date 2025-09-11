import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { paletteRegistry } from '@/shared/lib/palette'
import { resolveMaterial, materialToThreePropsWithPalette } from '@/shared/lib/materials'
import type { SceneObject, SceneObjectInstance } from '@/entities/scene/types'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'

interface CylinderPrimitiveLike {
  type: 'trunk' | 'branch'
  geometry: { radiusTop: number; radiusBottom: number; height: number }
  transform?: { position?: number[]; rotation?: number[]; scale?: number[] }
  material?: any
  objectMaterialUuid?: string
  globalMaterialUuid?: string
}

interface InstancedBranchesProps {
  sceneObject: SceneObject
  cylinders: { primitive: CylinderPrimitiveLike; index: number }[]
  instances: SceneObjectInstance[]
  materials?: any[]
  radialSegments?: number
  onClick?: (event: any) => void
  onHover?: (event: any) => void
}

/**
 * Инстансированный меш для веток/ствола: один unit‑cylinder + инстанс‑атрибуты
 * высоты и радиусов вершин. Таким образом множество цилиндров разных размеров
 * рендерятся одним draw call на группу.
 */
export const InstancedBranches: React.FC<InstancedBranchesProps> = ({
  sceneObject,
  cylinders,
  instances,
  materials,
  radialSegments = 12,
  onClick,
  onHover,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { gl } = useThree()

  // Палитра сцены из стора окружения
  const paletteUuid = useSceneStore(s => s.environmentContent?.paletteUuid || 'default')
  const activePalette = paletteRegistry.get(paletteUuid) || paletteRegistry.get('default')

  // Разрешаем материал из первого цилиндра (предполагаем один материал «Кора»)
  const samplePrimitive = cylinders[0]?.primitive as any
  const resolvedMaterial = useMemo(() => resolveMaterial({
    directMaterial: samplePrimitive?.material,
    objectMaterialUuid: samplePrimitive?.objectMaterialUuid,
    globalMaterialUuid: samplePrimitive?.globalMaterialUuid,
    objectMaterials: materials || sceneObject.materials,
  }), [samplePrimitive, materials, sceneObject.materials])
  const materialProps = useMemo(() => materialToThreePropsWithPalette(resolvedMaterial, activePalette as any), [resolvedMaterial, activePalette])

  // Общее число инстансов = инстансы сцены × кол-во цилиндров в объекте
  const count = instances.length * cylinders.length

  // Буферы инстанс‑атрибутов
  const aHeights = useMemo(() => new Float32Array(count), [count])
  const aRadTop = useMemo(() => new Float32Array(count), [count])
  const aRadBottom = useMemo(() => new Float32Array(count), [count])
  // Атрибуты «воротника» для ветвей
  const aCollarFrac = useMemo(() => new Float32Array(count), [count])
  const aCollarScale = useMemo(() => new Float32Array(count), [count])
  const aIsBranch = useMemo(() => new Float32Array(count), [count])

  // Устанавливаем instanceMatrix + атрибуты
  useEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()

    let k = 0
    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i]
      const it = inst.transform || {}
      const [ix, iy, iz] = it.position || [0,0,0]
      const [irx, iry, irz] = it.rotation || [0,0,0]
      const [isx, isy, isz] = it.scale || [1,1,1]

      const qInst = new THREE.Quaternion().setFromEuler(new THREE.Euler(irx, iry, irz, 'XYZ'))

      for (let j = 0; j < cylinders.length; j++) {
        const prim = cylinders[j].primitive
        const pt = prim.transform || {}
        const [px, py, pz] = pt.position || [0,0,0]
        const [prx, pry, prz] = pt.rotation || [0,0,0]
        const [psx, psy, psz] = pt.scale || [1,1,1]

        // Итоговый поворот = Qinst * Qprim
        const qPrim = new THREE.Quaternion().setFromEuler(new THREE.Euler(prx, pry, prz, 'XYZ'))
        const qFinal = new THREE.Quaternion().copy(qInst).multiply(qPrim)

        // Позиция: масштабируем локальный оффсет примитива масштабом инстанса,
        // поворачиваем в систему инстанса и переносим в позицию инстанса
        const vLocal = new THREE.Vector3(px, py, pz)
        vLocal.multiply(new THREE.Vector3(isx, isy, isz))
        vLocal.applyQuaternion(qInst)
        vLocal.add(new THREE.Vector3(ix, iy, iz))

        // Матрица инстанса: ТОЛЬКО поворот+позиция (масштаб = 1),
        // а масштаб высоты/радиусов задаём атрибутами для вершинного шейдера
        dummy.position.set(vLocal.x, vLocal.y, vLocal.z)
        dummy.quaternion.copy(qFinal)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(k, dummy.matrix)

        // Инстанс атрибуты: учитываем масштаб инстанса и примитива
        const geom: any = prim.geometry
        const height = (geom.height || 1) * isy * psy
        const rScale = 0.5 * (Math.abs(isx * psx) + Math.abs(isz * psz))
        aHeights[k] = height
        aRadTop[k] = (geom.radiusTop || 0.5) * rScale
        aRadBottom[k] = (geom.radiusBottom || 0.5) * rScale
        const cf = geom.collarFrac != null ? geom.collarFrac : (prim.type === 'branch' ? 0.15 : 0.0)
        const cs = geom.collarScale != null ? geom.collarScale : (prim.type === 'branch' ? 1.2 : 1.0)
        aIsBranch[k] = cf > 0 ? 1 : 0
        aCollarFrac[k] = cf
        aCollarScale[k] = cs

        k++
      }
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    // Проброс атрибутов в геометрию
    ;(meshRef.current.geometry as any).setAttribute('aHeight', new THREE.InstancedBufferAttribute(aHeights, 1))
    ;(meshRef.current.geometry as any).setAttribute('aRadiusTop', new THREE.InstancedBufferAttribute(aRadTop, 1))
    ;(meshRef.current.geometry as any).setAttribute('aRadiusBottom', new THREE.InstancedBufferAttribute(aRadBottom, 1))
    ;(meshRef.current.geometry as any).setAttribute('aCollarFrac', new THREE.InstancedBufferAttribute(aCollarFrac, 1))
    ;(meshRef.current.geometry as any).setAttribute('aCollarScale', new THREE.InstancedBufferAttribute(aCollarScale, 1))
    ;(meshRef.current.geometry as any).setAttribute('aIsBranch', new THREE.InstancedBufferAttribute(aIsBranch, 1))
  }, [instances, cylinders, aHeights, aRadTop, aRadBottom])

  // Обработчики событий — восстанавливаем UUID инстанса объекта по instanceId
  const handleClick = (event: any) => {
    if (!onClick) return
    const instanceId: number = event.instanceId
    if (instanceId == null) return
    const perInstance = cylinders.length
    const sceneInstIndex = Math.floor(instanceId / perInstance)
    const inst = instances[sceneInstIndex]
    onClick({
      ...event,
      userData: {
        generated: true,
        objectUuid: sceneObject.uuid,
        objectInstanceUuid: inst.uuid,
        isInstanced: true,
        instanceId,
        layerId: sceneObject.layerId || 'objects'
      }
    })
  }

  const handleHover = (event: any) => {
    if (!onHover) return
    const instanceId: number = event.instanceId
    if (instanceId == null) return
    const perInstance = cylinders.length
    const sceneInstIndex = Math.floor(instanceId / perInstance)
    const inst = instances[sceneInstIndex]
    onHover({
      ...event,
      userData: {
        generated: true,
        objectUuid: sceneObject.uuid,
        objectInstanceUuid: inst.uuid,
        isInstanced: true,
        instanceId,
        layerId: sceneObject.layerId || 'objects'
      }
    })
  }

  // Материал MeshStandard + модификация вершинника
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  const onMaterialRef = (mat: THREE.MeshStandardMaterial | null) => {
    if (!mat) return
    materialRef.current = mat
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>\nattribute float aHeight;\nattribute float aRadiusTop;\nattribute float aRadiusBottom;\nattribute float aCollarFrac;\nattribute float aCollarScale;\nattribute float aIsBranch;`
        )
        .replace(
          '#include <begin_vertex>',
          `\n// Unit‑cylinder: профиль радиуса с «воротником» у веток\nvec3 pos = position;\nfloat t = clamp(pos.y + 0.5, 0.0, 1.0);\nfloat r = mix(aRadiusBottom, aRadiusTop, t);\nfloat s = 1.0;\nif (aIsBranch > 0.5 && aCollarFrac > 0.0) {\n  if (t < aCollarFrac) {\n    float k = clamp(t / max(1e-4, aCollarFrac), 0.0, 1.0);\n    s = mix(aCollarScale, 1.0, k);\n  }\n}\nr *= s;\npos.y *= aHeight;\npos.xz *= r;\nvec3 transformed = pos;`
        )
    }
    mat.needsUpdate = true
  }

  // Единая геометрия: unit‑cylinder (r=1, h=1)
  const geometry = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, radialSegments), [radialSegments])

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined as any, count]}
      castShadow
      receiveShadow
      onClick={handleClick}
      onPointerOver={handleHover}
    >
      <meshStandardMaterial ref={onMaterialRef} {...materialProps} />
    </instancedMesh>
  )
}

export default InstancedBranches
