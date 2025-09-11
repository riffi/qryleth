import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import { paletteRegistry } from '@/shared/lib/palette'
import { resolveMaterial, materialToThreePropsWithPalette } from '@/shared/lib/materials'
import type { SceneObject, SceneObjectInstance } from '@/entities/scene/types'

interface SpherePrimitiveLike {
  type: 'leaf'
  geometry: { radius: number; shape?: 'billboard' | 'sphere' }
  transform?: { position?: number[]; rotation?: number[]; scale?: number[] }
  material?: any
  objectMaterialUuid?: string
  globalMaterialUuid?: string
}

interface InstancedLeavesProps {
  sceneObject: SceneObject
  spheres: { primitive: SpherePrimitiveLike; index: number }[]
  instances: SceneObjectInstance[]
  materials?: any[]
  segments?: number
  onClick?: (event: any) => void
  onHover?: (event: any) => void
}

/**
 * Единый InstancedMesh для листьев (сферы). Масштаб задается через instanceMatrix
 * с учетом радиуса сферы и масштабов примитива/инстанса.
 */
export const InstancedLeaves: React.FC<InstancedLeavesProps> = ({
  sceneObject,
  spheres,
  instances,
  materials,
  segments = 16,
  onClick,
  onHover,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  // Палитра сцены
  const paletteUuid = useSceneStore(s => s.environmentContent?.paletteUuid || 'default')
  const activePalette = paletteRegistry.get(paletteUuid) || paletteRegistry.get('default')

  // Разрешаем материал из первого листа (ожидается «Листья»)
  const samplePrimitive = spheres[0]?.primitive as any
  const resolvedMaterial = useMemo(() => resolveMaterial({
    directMaterial: samplePrimitive?.material,
    objectMaterialUuid: samplePrimitive?.objectMaterialUuid,
    globalMaterialUuid: samplePrimitive?.globalMaterialUuid,
    objectMaterials: materials || sceneObject.materials,
  }), [samplePrimitive, materials, sceneObject.materials])
  const materialProps = useMemo(() => materialToThreePropsWithPalette(resolvedMaterial, activePalette as any), [resolvedMaterial, activePalette])

  const billboardLeaves = useMemo(() => spheres.filter(s => s.primitive.geometry.shape !== 'sphere'), [spheres])
  const count = instances.length * billboardLeaves.length

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

      for (let j = 0; j < billboardLeaves.length; j++) {
        const prim = billboardLeaves[j].primitive
        const pt = prim.transform || {}
        const [px, py, pz] = pt.position || [0,0,0]
        const [prx, pry, prz] = pt.rotation || [0,0,0]
        const [psx, psy, psz] = pt.scale || [1,1,1]

        const qPrim = new THREE.Quaternion().setFromEuler(new THREE.Euler(prx, pry, prz, 'XYZ'))
        const qFinal = new THREE.Quaternion().copy(qInst).multiply(qPrim)

        // Позиция листа
        const vLocal = new THREE.Vector3(px, py, pz)
        vLocal.multiply(new THREE.Vector3(isx, isy, isz))
        vLocal.applyQuaternion(qInst)
        vLocal.add(new THREE.Vector3(ix, iy, iz))

        // Итоговый масштаб: радиус * scale примитива * scale инстанса (равномерный)
        const r = prim.geometry.radius || 0.5
        const shape = prim.geometry.shape || 'billboard'
        const scaleMul = shape === 'coniferCross' ? 2.0 : 1.0
        const uniformScale = r * Math.cbrt(Math.abs(isx * isy * isz)) * Math.cbrt(Math.abs(psx * psy * psz)) * scaleMul

        dummy.position.set(vLocal.x, vLocal.y, vLocal.z)
        dummy.quaternion.copy(qFinal)
        dummy.scale.set(uniformScale, uniformScale, uniformScale)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(k, dummy.matrix)
        k++
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [instances, spheres])

  const handleClick = (event: any) => {
    if (!onClick) return
    const instanceId: number = event.instanceId
    if (instanceId == null) return
    const perInstance = billboardLeaves.length
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
    const perInstance = billboardLeaves.length
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

  // Переходим от сфер к плоским биллбордам-листьям: базовая геометрия — плоскость 1x1
  const geometry = useMemo(() => {
    const shape = (billboardLeaves[0]?.primitive.geometry.shape) || 'billboard'
    const makePlane = () => new THREE.PlaneGeometry(1, 1, 1, 1)
    if (shape === 'coniferCross') {
      const p1 = makePlane()
      const p2 = makePlane()
      p2.rotateY(Math.PI / 2)
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
  }, [billboardLeaves])

  // Подкручиваем материал для маски формы листа и лёгкой подсветки на просвет
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  const onMaterialRef = (mat: THREE.MeshStandardMaterial | null) => {
    if (!mat) return
    materialRef.current = mat
    mat.side = THREE.DoubleSide
    mat.alphaTest = 0.5
    mat.onBeforeCompile = (shader) => {
      const shape = (billboardLeaves[0]?.primitive.geometry.shape) || 'billboard'
      shader.uniforms.uAspect = { value: shape === 'coniferCross' ? 2.4 : 0.6 }
      shader.uniforms.uEdgeSoftness = { value: 0.18 }
      shader.uniforms.uBend = { value: shape === 'coniferCross' ? 0.06 : 0.08 }

      // Добавляем объявления uniform и свою varying для UV
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\nuniform float uAspect;\nuniform float uEdgeSoftness;\nuniform float uBend;\nvarying vec2 vLeafUv;`)
        .replace('#include <begin_vertex>', `
          vec3 pos = position;
          vLeafUv = uv;
          float bend = (vLeafUv.y - 0.5);
          pos += normalize(normal) * ((bend * bend - 0.25) * uBend);
          vec3 transformed = pos;
        `)

      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nuniform float uAspect;\nuniform float uEdgeSoftness;\nvarying vec2 vLeafUv;`)
        .replace('#include <alphatest_fragment>', `
          // Эллиптическая маска листа в UV, мягкий край
          float dx = (vLeafUv.x - 0.5) / 0.5;
          float dy = (vLeafUv.y - 0.5) / 0.5 / uAspect;
          float r2 = dx*dx + dy*dy;
          // Правильный порядок границ smoothstep: edge0 < edge1
          float alphaMask = smoothstep(1.0 - uEdgeSoftness, 1.0, 1.0 - r2);
          diffuseColor.a *= alphaMask;
          #include <alphatest_fragment>
        `)
        .replace('#include <lights_fragment_end>', `
          #include <lights_fragment_end>
          // Простая подсветка на просвет (фейковая SSS) — добавляем диффуз к задней стороне
          float back = clamp(dot(normalize(-geometryNormal), normalize(vec3(0.2, 1.0, 0.1))), 0.0, 1.0);
          reflectedLight.indirectDiffuse += vec3(0.06, 0.1, 0.06) * back;
        `)

      // Пробрасываем униформы в материал
      ;(mat as any).userData.uniforms = shader.uniforms
    }
    mat.needsUpdate = true
  }

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

export default InstancedLeaves
