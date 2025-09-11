import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { GfxPrimitive } from '@/entities/primitive'
import type { GfxMaterial } from '@/entities/material'
import { resolveMaterial, materialToThreePropsWithPalette } from '@/shared/lib/materials'
import { paletteRegistry } from '@/shared/lib/palette'
import { usePalettePreviewUuid } from '../../../model/palettePreviewStore'

interface InstancedLeavesOEProps {
  leaves: { primitive: GfxPrimitive; index: number }[]
  objectMaterials?: GfxMaterial[]
  onPrimitiveClick?: (event: any) => void
  onPrimitiveHover?: (event: any) => void
}

/**
 * ObjectEditor‑версия инстансированного рендера листьев (плоские биллборды).
 */
export const InstancedLeavesOE: React.FC<InstancedLeavesOEProps> = ({ leaves, objectMaterials, onPrimitiveClick, onPrimitiveHover }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const paletteUuid = usePalettePreviewUuid()
  const activePalette = paletteRegistry.get(paletteUuid) || paletteRegistry.get('default')

  const sample = leaves[0]?.primitive
  const resolvedMaterial = useMemo(() => resolveMaterial({
    directMaterial: sample?.material,
    objectMaterialUuid: sample?.objectMaterialUuid,
    globalMaterialUuid: sample?.globalMaterialUuid,
    objectMaterials
  }), [sample, objectMaterials])
  const materialProps = useMemo(() => materialToThreePropsWithPalette(resolvedMaterial, activePalette as any), [resolvedMaterial, activePalette])

  const count = leaves.length

  useEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    for (let k = 0; k < leaves.length; k++) {
      const prim = leaves[k].primitive
      const t = prim.transform || {}
      const [px, py, pz] = t.position || [0,0,0]
      const [prx, pry, prz] = t.rotation || [0,0,0]
      const [psx, psy, psz] = t.scale || [1,1,1]
      // Радиус листа → масштаб. Для coniferCross усиливаем в 1.8–2.2 раза, чтобы кластер был заметнее
      const r = prim.type === 'leaf' ? (prim as any).geometry.radius : 0.5
      const shape = (prim as any).geometry?.shape || 'billboard'
      const scaleMul = shape === 'coniferCross' ? 2.0 : 1.0
      const uniformScale = r * Math.cbrt(Math.abs(psx * psy * psz)) * scaleMul
      dummy.position.set(px, py, pz)
      dummy.rotation.set(prx, pry, prz)
      dummy.scale.set(uniformScale, uniformScale, uniformScale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(k, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [leaves])

  const handleClick = (event: any) => {
    if (!onPrimitiveClick) return
    const instanceId: number = event.instanceId
    const primitiveIndex = leaves[instanceId]?.index
    if (primitiveIndex == null) return
    onPrimitiveClick({ ...event, userData: { generated: true, primitiveIndex } })
  }
  const handleHover = (event: any) => {
    if (!onPrimitiveHover) return
    const instanceId: number = event.instanceId
    const primitiveIndex = leaves[instanceId]?.index
    if (primitiveIndex == null) return
    onPrimitiveHover({ ...event, userData: { generated: true, primitiveIndex } })
  }

  // Геометрия: для coniferCross используем «крест» из двух плоскостей, иначе — одиночную плоскость
  const geometry = useMemo(() => {
    const shape = (sample as any)?.geometry?.shape || 'billboard'
    const makePlane = () => new THREE.PlaneGeometry(1, 1, 1, 1)
    if (shape === 'coniferCross') {
      const p1 = makePlane()
      const p2 = makePlane()
      p2.rotateY(Math.PI / 2)
      // Сшиваем вручную
      const g = new THREE.BufferGeometry()
      const pos1 = p1.getAttribute('position') as THREE.BufferAttribute
      const pos2 = p2.getAttribute('position') as THREE.BufferAttribute
      const uv1 = p1.getAttribute('uv') as THREE.BufferAttribute
      const uv2 = p2.getAttribute('uv') as THREE.BufferAttribute
      const normal1 = p1.getAttribute('normal') as THREE.BufferAttribute
      const normal2 = p2.getAttribute('normal') as THREE.BufferAttribute
      const index1 = p1.getIndex()!
      const index2 = p2.getIndex()!
      const positions = new Float32Array(pos1.array.length + pos2.array.length)
      positions.set(pos1.array as any, 0)
      positions.set(pos2.array as any, pos1.array.length)
      const uvs = new Float32Array(uv1.array.length + uv2.array.length)
      uvs.set(uv1.array as any, 0)
      uvs.set(uv2.array as any, uv1.array.length)
      const normals = new Float32Array(normal1.array.length + normal2.array.length)
      normals.set(normal1.array as any, 0)
      normals.set(normal2.array as any, normal1.array.length)
      const idx = new Uint16Array(index1.array.length + index2.array.length)
      idx.set(index1.array as any, 0)
      const offset = pos1.count
      for (let i = 0; i < index2.array.length; i++) idx[index1.array.length + i] = (index2.array as any)[i] + offset
      g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
      g.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
      g.setIndex(new THREE.BufferAttribute(idx, 1))
      g.computeBoundingSphere()
      g.computeBoundingBox()
      return g
    }
    return makePlane()
  }, [sample])

  // Тот же материал с onBeforeCompile: маска/изгиб/подсветка
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  const onMaterialRef = (mat: THREE.MeshStandardMaterial | null) => {
    if (!mat) return
    materialRef.current = mat
    mat.side = THREE.DoubleSide
    mat.alphaTest = 0.5
    mat.onBeforeCompile = (shader) => {
      const shape = (sample as any)?.geometry?.shape || 'billboard'
      shader.uniforms.uAspect = { value: shape === 'coniferCross' ? 2.4 : 0.6 }
      shader.uniforms.uEdgeSoftness = { value: 0.18 }
      shader.uniforms.uBend = { value: shape === 'coniferCross' ? 0.06 : 0.08 }
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\nuniform float uAspect;\nuniform float uEdgeSoftness;\nuniform float uBend;\nvarying vec2 vLeafUv;`)
        .replace('#include <begin_vertex>', `
          vec3 pos = position;
          vLeafUv = uv;
          float bend = (vLeafUv.y - 0.5);
          // Небольшой изгиб вдоль нормали — подходит и для креста
          pos += normalize(normal) * ((bend * bend - 0.25) * uBend);
          vec3 transformed = pos;
        `)
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nuniform float uAspect;\nuniform float uEdgeSoftness;\nvarying vec2 vLeafUv;`)
        .replace('#include <alphatest_fragment>', `
          float dx = (vLeafUv.x - 0.5) / 0.5;
          float dy = (vLeafUv.y - 0.5) / 0.5 / uAspect;
          float r2 = dx*dx + dy*dy;
          float alphaMask = smoothstep(1.0 - uEdgeSoftness, 1.0, 1.0 - r2);
          diffuseColor.a *= alphaMask;
          #include <alphatest_fragment>
        `)
        .replace('#include <lights_fragment_end>', `
          #include <lights_fragment_end>
          float back = clamp(dot(normalize(-geometryNormal), normalize(vec3(0.2, 1.0, 0.1))), 0.0, 1.0);
          reflectedLight.indirectDiffuse += vec3(0.06, 0.1, 0.06) * back;
        `)
      ;(mat as any).userData.uniforms = shader.uniforms
    }
    mat.needsUpdate = true
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry as any, undefined as any, count]}
      castShadow
      receiveShadow
      onClick={handleClick}
      onPointerOver={handleHover}
    >
      <meshStandardMaterial ref={onMaterialRef} {...materialProps} />
    </instancedMesh>
  )
}

export default InstancedLeavesOE
