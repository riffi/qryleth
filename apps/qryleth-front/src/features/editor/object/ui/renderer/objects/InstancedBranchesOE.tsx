import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { GfxPrimitive } from '@/entities/primitive'
import type { GfxMaterial } from '@/entities/material'
import { resolveMaterial, materialToThreePropsWithPalette } from '@/shared/lib/materials'
import { paletteRegistry } from '@/shared/lib/palette'
import { usePalettePreviewUuid } from '../../../model/palettePreviewStore'

interface InstancedBranchesOEProps {
  /** Массив цилиндров (например, ствол+ветви) */
  cylinders: { primitive: GfxPrimitive; index: number }[]
  /** Материалы объекта */
  objectMaterials?: GfxMaterial[]
  /** Колбэк клика по инстансу: пробрасывает event с userData.primitiveIndex */
  onPrimitiveClick?: (event: any) => void
  onPrimitiveHover?: (event: any) => void
}

/**
 * ObjectEditor‑версия инстансированного рендера цилиндров (ствол/ветви).
 * Использует unit‑cylinder и инстанс‑атрибуты радиусов/высоты, как в SceneEditor.
 */
export const InstancedBranchesOE: React.FC<InstancedBranchesOEProps> = ({ cylinders, objectMaterials, onPrimitiveClick, onPrimitiveHover }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const paletteUuid = usePalettePreviewUuid()
  const activePalette = paletteRegistry.get(paletteUuid) || paletteRegistry.get('default')

  const sample = cylinders[0]?.primitive
  const resolvedMaterial = useMemo(() => resolveMaterial({
    directMaterial: sample?.material,
    objectMaterialUuid: sample?.objectMaterialUuid,
    globalMaterialUuid: sample?.globalMaterialUuid,
    objectMaterials
  }), [sample, objectMaterials])
  const materialProps = useMemo(() => materialToThreePropsWithPalette(resolvedMaterial, activePalette as any), [resolvedMaterial, activePalette])

  const count = cylinders.length
  const aHeights = useMemo(() => new Float32Array(count), [count])
  const aRadTop = useMemo(() => new Float32Array(count), [count])
  const aRadBottom = useMemo(() => new Float32Array(count), [count])

  useEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    for (let k = 0; k < cylinders.length; k++) {
      const prim = cylinders[k].primitive
      const t = prim.transform || {}
      const [px, py, pz] = t.position || [0,0,0]
      const [prx, pry, prz] = t.rotation || [0,0,0]
      const [psx, psy, psz] = t.scale || [1,1,1]
      dummy.position.set(px, py, pz)
      dummy.rotation.set(prx, pry, prz)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(k, dummy.matrix)

      aHeights[k] = (prim.type === 'trunk' || prim.type === 'branch' ? (prim as any).geometry.height : 1) * psy
      const rTop = (prim as any).geometry.radiusTop ?? 0.5
      const rBot = (prim as any).geometry.radiusBottom ?? 0.5
      const rScale = 0.5 * (Math.abs(psx) + Math.abs(psz))
      aRadTop[k] = rTop * rScale
      aRadBottom[k] = rBot * rScale
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    ;(meshRef.current.geometry as any).setAttribute('aHeight', new THREE.InstancedBufferAttribute(aHeights, 1))
    ;(meshRef.current.geometry as any).setAttribute('aRadiusTop', new THREE.InstancedBufferAttribute(aRadTop, 1))
    ;(meshRef.current.geometry as any).setAttribute('aRadiusBottom', new THREE.InstancedBufferAttribute(aRadBottom, 1))
  }, [cylinders, aHeights, aRadTop, aRadBottom])

  const handleClick = (event: any) => {
    if (!onPrimitiveClick) return
    const instanceId: number = event.instanceId
    const primitiveIndex = cylinders[instanceId]?.index
    if (primitiveIndex == null) return
    onPrimitiveClick({ ...event, userData: { generated: true, primitiveIndex } })
  }
  const handleHover = (event: any) => {
    if (!onPrimitiveHover) return
    const instanceId: number = event.instanceId
    const primitiveIndex = cylinders[instanceId]?.index
    if (primitiveIndex == null) return
    onPrimitiveHover({ ...event, userData: { generated: true, primitiveIndex } })
  }

  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  const onMaterialRef = (mat: THREE.MeshStandardMaterial | null) => {
    if (!mat) return
    materialRef.current = mat
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\nattribute float aHeight;\nattribute float aRadiusTop;\nattribute float aRadiusBottom;`)
        .replace('#include <begin_vertex>', `\nvec3 pos = position;\nfloat t = clamp(pos.y + 0.5, 0.0, 1.0);\nfloat r = mix(aRadiusBottom, aRadiusTop, t);\npos.y *= aHeight;\npos.xz *= r;\nvec3 transformed = pos;`)
    }
    mat.needsUpdate = true
  }

  const geometry = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 12), [])

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

export default InstancedBranchesOE
