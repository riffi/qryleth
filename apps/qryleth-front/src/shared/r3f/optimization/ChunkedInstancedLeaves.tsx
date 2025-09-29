import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { paletteRegistry } from '@/shared/lib/palette'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import { usePartitionInstancesByLod, defaultTreeLodConfig } from '@/shared/r3f/optimization/treeLod'
import type { SceneLayer, SceneObject, SceneObjectInstance } from '@/entities/scene/types'
import { resolveMaterial, materialToThreePropsWithPalette } from '@/shared/lib/materials'
import { makeConiferCrossGeometry, makeLeafPlaneGeometry } from '@/shared/r3f/leaves/makeLeafGeometry'
import { useLeafTextures } from '@/shared/r3f/leaves/useLeafTextures'
import { patchLeafMaterial } from '@/shared/r3f/leaves/patchLeafMaterial'

type LeafShape = 'billboard' | 'coniferCross' | 'texture' | 'sphere'

interface LeafPrimitiveLike {
  type: 'leaf'
  geometry: { radius: number; shape?: LeafShape; texSpriteName?: string }
  transform?: { position?: number[]; rotation?: number[]; scale?: number[] }
  material?: any
  objectMaterialUuid?: string
  globalMaterialUuid?: string
}

interface LeafItem {
  sceneObject: SceneObject
  instance: SceneObjectInstance
  primitive: LeafPrimitiveLike
}

interface ChunkKeyBase {
  cx: number
  cz: number
}

interface BillboardKey extends ChunkKeyBase {
  t: 'bb'
  shape: Exclude<LeafShape, 'sphere'>
  materialUuid: string
  setId?: string
  sprite?: string
  paintFactor?: number
}

interface SphereKey extends ChunkKeyBase {
  t: 'sp'
  materialUuid: string
}

type AnyKey = BillboardKey | SphereKey

interface ChunkBucket {
  key: AnyKey
  items: LeafItem[]
}

function keyToString(k: AnyKey): string {
  // Ключ сегмента — строка для Map. Все важные параметры включены для изоляции групп.
  if (k.t === 'bb') {
    return `bb|${k.cx}|${k.cz}|${k.shape}|${k.materialUuid}|${k.setId || 'def'}|${k.sprite || 'def'}|pf:${k.paintFactor ?? 'na'}`
  }
  return `sp|${k.cx}|${k.cz}|${k.materialUuid}`
}

/**
 * Возвращает true, если инстанс видим полностью по слоям/видимости объекта/инстанса.
 */
function isInstanceCompletelyVisible(instance: SceneObjectInstance, sceneObject: SceneObject, layers: SceneLayer[]): boolean {
  const layerId = sceneObject.layerId || 'objects'
  const layer = layers.find(l => l.id === layerId)
  const isLayerVisible = layer ? layer.visible : true
  const isObjectVisible = sceneObject.visible !== false
  const isInstanceVisible = instance.visible !== false
  return isLayerVisible && isObjectVisible && isInstanceVisible
}

/**
 * Хэширует строку в число [0..1] для детерминированного LOD-сэмплинга.
 */
function hashToUnit(s: string): number { let h = 2166136261 >>> 0; for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h=Math.imul(h,16777619)}; return (h>>>0)/4294967295 }

/**
 * Собирает все листовые примитивы для списка инстансов с фильтрацией по LOD.
 * Для дальнего LOD применяет детерминированный сэмплинг по UUID листа.
 */
function collectLeafItems(
  objectsById: Map<string, SceneObject>,
  instances: SceneObjectInstance[],
  farSamplingRatio?: number,
): LeafItem[] {
  const out: LeafItem[] = []
  const perObjectAllow: Map<string, Set<string>> = new Map()
  // Предварительно для каждого объекта выбираем стабильное подмножество листьев (по uuid)
  if (farSamplingRatio != null && farSamplingRatio < 0.999) {
    for (const obj of objectsById.values()) {
      const leaves = (obj.primitives || []).filter(p => p.type === 'leaf') as LeafPrimitiveLike[]
      const allow = new Set<string>()
      for (const p of leaves) {
        const id = (p as any)?.uuid || (p as any)?.name || 'leaf'
        if (hashToUnit(String(id)) <= Math.max(0, Math.min(1, farSamplingRatio))) allow.add(String(id))
      }
      perObjectAllow.set(obj.uuid, allow)
    }
  }

  for (const inst of instances) {
    const obj = objectsById.get(inst.objectUuid)
    if (!obj) continue
    for (const p of (obj.primitives || [])) {
      if (p.type !== 'leaf') continue
      if (farSamplingRatio != null && farSamplingRatio < 0.999) {
        const allow = perObjectAllow.get(obj.uuid)
        const id = (p as any)?.uuid || (p as any)?.name || 'leaf'
        if (!allow?.has(String(id))) continue
      }
      out.push({ sceneObject: obj, instance: inst, primitive: p as any })
    }
  }
  return out
}

/**
 * Группирует листовые элементы по сегментам (чанкам) и ключам материала/формы.
 * Сегментная сетка — по XZ с шагом chunkSize.
 */
function bucketizeByChunks(
  items: LeafItem[],
  chunkSize: number
): Map<string, ChunkBucket> {
  const map = new Map<string, ChunkBucket>()
  const half = chunkSize * 0.5
  for (const it of items) {
    const instT = it.instance.transform || {}
    const [ix, , iz] = instT.position || [0,0,0]
    const cx = Math.floor(ix / chunkSize) * chunkSize + half
    const cz = Math.floor(iz / chunkSize) * chunkSize + half

    const shape = (it.primitive.geometry.shape || 'billboard') as LeafShape
    const m = resolveMaterial({
      directMaterial: it.primitive.material,
      objectMaterialUuid: it.primitive.objectMaterialUuid,
      globalMaterialUuid: it.primitive.globalMaterialUuid,
      objectMaterials: it.sceneObject.materials,
    })
    const materialUuid = (m as any)?.uuid || 'default-material'

    let key: AnyKey
    if (shape === 'sphere') {
      key = { t: 'sp', cx, cz, materialUuid }
    } else {
      const setId = (it.sceneObject as any)?.treeData?.params?.leafTextureSetId as (string | undefined)
      const sprite = (it.primitive.geometry as any)?.texSpriteName as (string | undefined)
      const paintFactor = (it.sceneObject as any)?.treeData?.params?.leafTexturePaintFactor as (number | undefined)
      key = { t: 'bb', cx, cz, shape: shape as any, materialUuid, setId, sprite, paintFactor }
    }

    const ks = keyToString(key)
    let bucket = map.get(ks)
    if (!bucket) {
      bucket = { key, items: [] }
      map.set(ks, bucket)
    }
    bucket.items.push(it)
  }
  return map
}

/**
 * Компонент‑меш для одного чанка сферических листьев.
 * На вход получает список элементов и рендерит их в одном InstancedMesh с корректным boundingSphere.
 */
const LeafSphereChunkMesh: React.FC<{
  bucket: ChunkBucket & { key: SphereKey }
  paletteUuid: string
  scaleMul?: number
  onClick?: (e: any) => void
  onHover?: (e: any) => void
}> = ({ bucket, paletteUuid, scaleMul = 1, onClick, onHover }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  // Материал по представителю из бакета
  const sample = bucket.items[0]
  const activePalette = paletteRegistry.get(paletteUuid) || paletteRegistry.get('default')
  const resolved = useMemo(() => resolveMaterial({
    directMaterial: sample.primitive.material,
    objectMaterialUuid: sample.primitive.objectMaterialUuid,
    globalMaterialUuid: sample.primitive.globalMaterialUuid,
    objectMaterials: sample.sceneObject.materials,
  }), [sample])
  const materialProps = useMemo(() => materialToThreePropsWithPalette(resolved, activePalette as any), [resolved, activePalette])

  // Геометрия сферы 1x1, клонируем для индивидуального boundingSphere
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 12, 12).clone(), [])

  // Освобождаем геометрию/материал на размонтировании (утечки геометрий при смене чанка)
  useEffect(() => {
    return () => {
      try { (meshRef.current?.geometry as any)?.dispose?.() } catch {}
      try { ((meshRef.current?.material as any) as THREE.Material)?.dispose?.() } catch {}
    }
  }, [])

  // Заполняем матрицы и считаем boundingSphere
  useEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    let minY = Number.POSITIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    let maxR = 0
    for (let k = 0; k < bucket.items.length; k++) {
      const { instance, primitive } = bucket.items[k]
      const it = instance.transform || {}
      const pt = primitive.transform || {}
      const [ix, iy, iz] = it.position || [0,0,0]
      const [irx, iry, irz] = it.rotation || [0,0,0]
      const [isx, isy, isz] = it.scale || [1,1,1]
      const [px, py, pz] = pt.position || [0,0,0]
      const [prx, pry, prz] = pt.rotation || [0,0,0]
      const [psx, psy, psz] = pt.scale || [1,1,1]

      const qInst = new THREE.Quaternion().setFromEuler(new THREE.Euler(irx, iry, irz, 'XYZ'))
      const qPrim = new THREE.Quaternion().setFromEuler(new THREE.Euler(prx, pry, prz, 'XYZ'))
      const qFinal = new THREE.Quaternion().copy(qInst).multiply(qPrim)

      const vLocal = new THREE.Vector3(px, py, pz)
      vLocal.multiply(new THREE.Vector3(isx, isy, isz))
      vLocal.applyQuaternion(qInst)
      vLocal.add(new THREE.Vector3(ix, iy, iz))

      const r = (primitive.geometry.radius || 0.5) * Math.cbrt(Math.abs(isx * isy * isz)) * Math.cbrt(Math.abs(psx * psy * psz)) * (scaleMul || 1)

      // Перевод в локальные координаты чанка
      const cx = bucket.key.cx, cz = bucket.key.cz
      const lx = vLocal.x - cx
      const ly = vLocal.y
      const lz = vLocal.z - cz

      dummy.position.set(lx, ly, lz)
      dummy.quaternion.copy(qFinal)
      dummy.scale.set(r, r, r)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(k, dummy.matrix)

      minY = Math.min(minY, ly - r)
      maxY = Math.max(maxY, ly + r)
      const dHoriz = Math.hypot(lx, lz) + r
      maxR = Math.max(maxR, dHoriz)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    // Центр сферы по Y — середина диапазона высот; радиус — макс(горизонтальный, вертикальный половинный)
    const centerY = (minY + maxY) * 0.5
    const vertRad = (maxY - minY) * 0.5
    let boundRad = Math.max(maxR, vertRad)
    boundRad *= 1.06
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, centerY, 0), boundRad)
  }, [bucket.items, bucket.key.cx, bucket.key.cz])

  const handleClick = (event: any) => {
    if (!onClick) return
    const idx: number = (event as any).instanceId
    if (idx == null || idx < 0 || idx >= bucket.items.length) return
    const it = bucket.items[idx]
    const syntheticObject = { userData: { generated: true, objectUuid: it.sceneObject.uuid, objectInstanceUuid: it.instance.uuid, isInstanced: true, layerId: it.sceneObject.layerId || 'objects' } }
    onClick({ ...event, object: syntheticObject })
  }
  const handleHover = (event: any) => {
    if (!onHover) return
    const idx: number = (event as any).instanceId
    if (idx == null || idx < 0 || idx >= bucket.items.length) return
    const it = bucket.items[idx]
    const syntheticObject = { userData: { generated: true, objectUuid: it.sceneObject.uuid, objectInstanceUuid: it.instance.uuid, isInstanced: true, layerId: it.sceneObject.layerId || 'objects' } }
    onHover({ ...event, object: syntheticObject })
  }

  if (bucket.items.length === 0) return null
  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry as any, undefined as any, bucket.items.length]}
      position={[bucket.key.cx, 0, bucket.key.cz]}
      castShadow
      receiveShadow
      onClick={handleClick}
      onPointerOver={handleHover}
    >
      <meshStandardMaterial {...materialProps} />
    </instancedMesh>
  )
}

/**
 * Компонент‑меш для одного чанка плоских листьев (billboard/coniferCross/texture).
 * Загружает карты для текстурного режима, применяет patchLeafMaterial и формирует матрицы.
 */
const LeafBillboardChunkMesh: React.FC<{
  bucket: ChunkBucket & { key: BillboardKey }
  paletteUuid: string
  scaleMul?: number
  fadeByUuid?: Map<string, number>
  onClick?: (e: any) => void
  onHover?: (e: any) => void
}> = ({ bucket, paletteUuid, scaleMul = 1, fadeByUuid, onClick, onHover }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  const sample = bucket.items[0]
  const activePalette = paletteRegistry.get(paletteUuid) || paletteRegistry.get('default')
  const resolved = useMemo(() => resolveMaterial({
    directMaterial: sample.primitive.material,
    objectMaterialUuid: sample.primitive.objectMaterialUuid,
    globalMaterialUuid: sample.primitive.globalMaterialUuid,
    objectMaterials: sample.sceneObject.materials,
  }), [sample])
  const materialProps = useMemo(() => materialToThreePropsWithPalette(resolved, activePalette as any), [resolved, activePalette])
  // Целевой цвет листвы в линейном пространстве для HSV-покраски в шейдере
  const targetLeafColorLinear = useMemo(() => {
    const hex = (materialProps as any)?.color || (resolved as any)?.properties?.color || '#2E8B57'
    const c = new THREE.Color(hex)
    ;(c as any).convertSRGBToLinear?.()
    return c
  }, [materialProps, resolved])

  const effectiveShape = bucket.key.shape
  const spriteNameKey = bucket.key.sprite || 'default'
  const paintFactor = bucket.key.paintFactor ?? 0
  // useLeafTextures: только для texture-режима
  const { diffuseMap, alphaMap, normalMap, roughnessMap, texAspect, anchorUV } = useLeafTextures(
    bucket.key.setId,
    effectiveShape === 'texture',
    spriteNameKey,
    () => (materialRef.current as any)?.userData?.uniforms,
  )

  // Базовая геометрия и ее клон для корректного boundingSphere
  const geometry = useMemo(() => {
    const base = effectiveShape === 'coniferCross' ? makeConiferCrossGeometry() : makeLeafPlaneGeometry()
    const g = (base as any).clone?.() || base
    return g as THREE.BufferGeometry
  }, [effectiveShape])

  // Cleanup на unmount: освобождаем только геометрию/материал (текстуры кэшируются отдельно)
  useEffect(() => {
    return () => {
      try { (meshRef.current?.geometry as any)?.dispose?.() } catch {}
      try { ((meshRef.current?.material as any) as THREE.Material)?.dispose?.() } catch {}
    }
  }, [])

  // Материал: патч шейдеров листвы
  const onMaterialRef = (mat: THREE.MeshStandardMaterial | null) => {
    if (!mat) return
    materialRef.current = mat
    patchLeafMaterial(mat, {
      shape: effectiveShape as any,
      texAspect: texAspect || 1,
      rectDebug: false,
      edgeDebug: false,
      leafPaintFactor: paintFactor,
      targetLeafColorLinear: targetLeafColorLinear,
      backlightStrength: 0,
      fade: 1,
      useInstanceFade: true,
    })
  }

  // Вычисляем матрицы и boundingSphere
  useEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    let minY = Number.POSITIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    let maxR = 0
    const cx = bucket.key.cx, cz = bucket.key.cz

    const fades: number[] = new Array(bucket.items.length).fill(1)
    for (let k = 0; k < bucket.items.length; k++) {
      const { instance, primitive } = bucket.items[k]
      const it = instance.transform || {}
      const pt = primitive.transform || {}
      const [ix, iy, iz] = it.position || [0,0,0]
      const [irx, iry, irz] = it.rotation || [0,0,0]
      const [isx, isy, isz] = it.scale || [1,1,1]
      const [px, py, pz] = pt.position || [0,0,0]
      const [prx, pry, prz] = pt.rotation || [0,0,0]
      const [psx, psy, psz] = pt.scale || [1,1,1]

      const qInst = new THREE.Quaternion().setFromEuler(new THREE.Euler(irx, iry, irz, 'XYZ'))
      const qPrim = new THREE.Quaternion().setFromEuler(new THREE.Euler(prx, pry, prz, 'XYZ'))
      const qFinal = new THREE.Quaternion().copy(qInst).multiply(qPrim)

      const vLocal = new THREE.Vector3(px, py, pz)
      vLocal.multiply(new THREE.Vector3(isx, isy, isz))
      vLocal.applyQuaternion(qInst)
      vLocal.add(new THREE.Vector3(ix, iy, iz))

      const r = primitive.geometry.radius || 0.5
      const shapeScaleMul = effectiveShape === 'coniferCross' ? 2.0 : 1.0
      const uniformScale = r * Math.cbrt(Math.abs(isx * isy * isz)) * Math.cbrt(Math.abs(psx * psy * psz)) * shapeScaleMul * (scaleMul || 1)
      const sx = effectiveShape === 'texture' ? uniformScale * (texAspect || 1) : uniformScale
      const sy = uniformScale
      const sz = uniformScale

      // Перевод в локальные координаты чанка
      const lx = vLocal.x - cx
      const ly = vLocal.y
      const lz = vLocal.z - cz
      dummy.position.set(lx, ly, lz)

      // Смещение опоры спрайта для texture-режима
      if (effectiveShape === 'texture') {
        const u = (anchorUV?.[0] ?? 0.5)
        const v = (anchorUV?.[1] ?? 1.0)
        const dx = (0.5 - u) * sx
        const dy = (v - 0.5) * sy
        const off = new THREE.Vector3(dx, dy, 0)
        off.applyQuaternion(qFinal)
        dummy.position.add(off)
      }

      dummy.quaternion.copy(qFinal)
      dummy.scale.set(sx, sy, sz)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(k, dummy.matrix)
      // Фейд: если передан fadeByUuid, берём по uuid инстанса
      const uuid = instance.uuid
      const f = fadeByUuid?.get(uuid)
      fades[k] = (f == null ? 1 : Math.max(0, Math.min(1, f)))

      // После возможного anchor‑смещения используем фактическую Y‑позицию dummy
      const y = dummy.position.y
      minY = Math.min(minY, y - sy)
      maxY = Math.max(maxY, y + sy)
      const dHoriz = Math.hypot(dummy.position.x, dummy.position.z) + Math.max(sx, sz)
      maxR = Math.max(maxR, dHoriz)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    // Пер‑инстансовый атрибут aFade
    const arr = new Float32Array(fades)
    geometry.setAttribute('aFade', new THREE.InstancedBufferAttribute(arr, 1))
    const centerY = (minY + maxY) * 0.5
    const vertRad = (maxY - minY) * 0.5
    let boundRad = Math.max(maxR, vertRad)
    boundRad *= 1.06 // небольшой запас против «пограничного» отсекающего мерцания
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, centerY, 0), boundRad)
  }, [bucket.items, bucket.key.cx, bucket.key.cz, effectiveShape, texAspect, anchorUV, scaleMul])

  // Инстансовый атрибут aLeafPaintMul для пер-листового разброса покраски (jitter)
  useEffect(() => {
    if (!meshRef.current) return
    if (effectiveShape !== 'texture') return
    const g = meshRef.current.geometry as THREE.BufferGeometry
    const arr = new Float32Array(bucket.items.length)
    for (let k = 0; k < bucket.items.length; k++) {
      const { sceneObject, primitive, instance } = bucket.items[k]
      const jitter = (sceneObject as any)?.treeData?.params?.leafTexturePaintJitter ?? 0
      const primUuid = (primitive as any)?.uuid || String(k)
      const instUuid = (instance as any)?.uuid || String(k)
      const rnd = hashToUnit(String(instUuid + '/' + primUuid))
      const mul = 1 - Math.max(0, Math.min(1, jitter)) * rnd
      arr[k] = mul
    }
    g.setAttribute('aLeafPaintMul', new THREE.InstancedBufferAttribute(arr, 1))
  }, [bucket.items, effectiveShape])

  const handleClick = (event: any) => {
    if (!onClick) return
    const idx: number = (event as any).instanceId
    if (idx == null || idx < 0 || idx >= bucket.items.length) return
    const it = bucket.items[idx]
    const syntheticObject = { userData: { generated: true, objectUuid: it.sceneObject.uuid, objectInstanceUuid: it.instance.uuid, isInstanced: true, layerId: it.sceneObject.layerId || 'objects' } }
    onClick({ ...event, object: syntheticObject })
  }
  const handleHover = (event: any) => {
    if (!onHover) return
    const idx: number = (event as any).instanceId
    if (idx == null || idx < 0 || idx >= bucket.items.length) return
    const it = bucket.items[idx]
    const syntheticObject = { userData: { generated: true, objectUuid: it.sceneObject.uuid, objectInstanceUuid: it.instance.uuid, isInstanced: true, layerId: it.sceneObject.layerId || 'objects' } }
    onHover({ ...event, object: syntheticObject })
  }

  // Обновление униформ при изменении фактора/цвета без ремонта шейдера
  useEffect(() => {
    if (!materialRef.current) return
    if (effectiveShape !== 'texture') return
    const uniforms = (materialRef.current as any)?.userData?.uniforms
    if (!uniforms) return
    if (uniforms.uLeafPaintFactor) uniforms.uLeafPaintFactor.value = paintFactor
    if (uniforms.uLeafTargetColor) uniforms.uLeafTargetColor.value.set(targetLeafColorLinear.r, targetLeafColorLinear.g, targetLeafColorLinear.b)
  }, [effectiveShape, paintFactor, targetLeafColorLinear])

  if (bucket.items.length === 0) return null
  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry as any, undefined as any, bucket.items.length]}
      position={[bucket.key.cx, 0, bucket.key.cz]}
      frustumCulled={true}
      castShadow
      onClick={handleClick}
      onPointerOver={handleHover}
    >
      <meshStandardMaterial
        key={`leafMat-${effectiveShape}-${spriteNameKey}-${!!diffuseMap}`}
        ref={onMaterialRef}
        {...materialProps}
        envMapIntensity={1}
        color={'#FFFFFF'}
        map={effectiveShape === 'texture' ? diffuseMap || undefined : undefined}
        alphaMap={effectiveShape === 'texture' ? alphaMap || undefined : undefined}
        normalMap={effectiveShape === 'texture' ? normalMap || undefined : undefined}
        roughnessMap={effectiveShape === 'texture' ? roughnessMap || undefined : undefined}
        transparent={false}
        alphaTest={effectiveShape === 'texture' ? (!!diffuseMap ? 0.5 : 0.0) : (materialProps as any).alphaTest}
      alphaToCoverage={effectiveShape === 'texture' ? true : undefined}
    />
    </instancedMesh>
  )
}

// Примечание: очистка ресурсов происходит внутри компонентов LeafSphereChunkMesh/LeafBillboardChunkMesh

export interface ChunkedInstancedLeavesProps {
  /** Полный список объектов сцены */
  objects: SceneObject[]
  /** Полный список инстансов объектов */
  instances: SceneObjectInstance[]
  /** Слои сцены для фильтрации видимости */
  layers: SceneLayer[]
  /** Размер сегментации по XZ в метрах */
  chunkSize?: number
  onClick?: (e: any) => void
  onHover?: (e: any) => void
}

/**
 * Сегментированный по сцене рендер листвы. Агрегирует листья всех объектов, разбивает по чанкам
 * (32м по умолчанию) и рендерит один InstancedMesh на чанк/материал/форму. Фрустум‑куллинг работает
 * по чанк‑сферам, а не по всему набору листьев сразу.
 */
export const ChunkedInstancedLeaves: React.FC<ChunkedInstancedLeavesProps> = ({ objects, instances, layers, chunkSize = 32, onClick, onHover }) => {
  const paletteUuid = useSceneStore(s => s.environmentContent?.paletteUuid || 'default')

  // Фильтруем видимые инстансы, а также оставляем только те, у чьих объектов есть листья
  const objectsById = useMemo(() => new Map(objects.map(o => [o.uuid, o])), [objects])
  const hasLeavesObjectIds = useMemo(() => {
    const s = new Set<string>()
    for (const o of objects) {
      if ((o.primitives || []).some(p => p.type === 'leaf')) s.add(o.uuid)
    }
    return s
  }, [objects])
  const visibleInstances = useMemo(() => {
    return instances.filter(inst => {
      if (!hasLeavesObjectIds.has(inst.objectUuid)) return false
      const obj = objectsById.get(inst.objectUuid)
      if (!obj) return false
      return isInstanceCompletelyVisible(inst, obj, layers)
    })
  }, [instances, objectsById, layers, hasLeavesObjectIds])

  // Разделяем инстансы на near/far по дистанции (общий LOD для всех деревьев)
  // Конфигурация LOD c экрана — берём из zustand-стора сцены
  const lodCfg = useSceneStore(s => s.lodConfig)
  const { nearSolid, farSolid, nearFarBlend, farBillboardBlend, leafSampleRatioFar, leafScaleMulFar } = usePartitionInstancesByLod(visibleInstances, {
    enabled: lodCfg.enabled,
    nearInPx: lodCfg.nearInPx,
    nearOutPx: lodCfg.nearOutPx,
    farInPx: lodCfg.farInPx,
    farOutPx: lodCfg.farOutPx,
    approximateTreeHeightWorld: 10,
    nearDistance: 30,
    farDistance: 50,
    billboardDistance: 70,
    farLeafSampleRatio: defaultTreeLodConfig.farLeafSampleRatio,
    farLeafScaleMul: defaultTreeLodConfig.farLeafScaleMul,
    nearTrunkRadialSegments: defaultTreeLodConfig.nearTrunkRadialSegments,
    farTrunkRadialSegments: defaultTreeLodConfig.farTrunkRadialSegments,
    includeBranchesFar: defaultTreeLodConfig.includeBranchesFar,
  }) as any

  // Собираем листовые элементы
  const nearItems = useMemo(() => collectLeafItems(objectsById, nearSolid), [objectsById, nearSolid])
  const farItems = useMemo(() => collectLeafItems(objectsById, farSolid, leafSampleRatioFar), [objectsById, farSolid, leafSampleRatioFar])
  // Переходные наборы
  const nearBlendInstances = useMemo(() => (nearFarBlend || []).map((x: any) => x.inst), [nearFarBlend])
  const farBlendInstances = useMemo(() => (nearFarBlend || []).map((x: any) => x.inst), [nearFarBlend])
  const farOutInstances = useMemo(() => (farBillboardBlend || []).map((x: any) => x.inst), [farBillboardBlend])
  const nearBlendItems = useMemo(() => collectLeafItems(objectsById, nearBlendInstances), [objectsById, nearBlendInstances])
  const farBlendItems = useMemo(() => collectLeafItems(objectsById, farBlendInstances, leafSampleRatioFar), [objectsById, farBlendInstances, leafSampleRatioFar])
  const farOutItems = useMemo(() => collectLeafItems(objectsById, farOutInstances, leafSampleRatioFar), [objectsById, farOutInstances, leafSampleRatioFar])
  // Карты фейда по uuid
  const nearBlendFade = useMemo(() => { const m = new Map<string, number>(); for (const x of (nearFarBlend||[])) m.set(x.inst.uuid, Math.max(0, Math.min(1, 1 - x.t))); return m }, [nearFarBlend])
  const farBlendFade = useMemo(() => { const m = new Map<string, number>(); for (const x of (nearFarBlend||[])) m.set(x.inst.uuid, Math.max(0, Math.min(1, x.t))); return m }, [nearFarBlend])
  const farOutFade = useMemo(() => { const m = new Map<string, number>(); for (const x of (farBillboardBlend||[])) m.set(x.inst.uuid, Math.max(0, Math.min(1, 1 - x.t))); return m }, [farBillboardBlend])

  // Бакетизация по чанкам
  const nearBuckets = useMemo(() => bucketizeByChunks(nearItems, chunkSize), [nearItems, chunkSize])
  const farBuckets = useMemo(() => bucketizeByChunks(farItems, chunkSize), [farItems, chunkSize])
  const nearBlendBuckets = useMemo(() => bucketizeByChunks(nearBlendItems, chunkSize), [nearBlendItems, chunkSize])
  const farBlendBuckets = useMemo(() => bucketizeByChunks(farBlendItems, chunkSize), [farBlendItems, chunkSize])
  const farOutBuckets = useMemo(() => bucketizeByChunks(farOutItems, chunkSize), [farOutItems, chunkSize])

  // Отладка стабильности чанков: логируем изменения состава ключей
  const prevKeysRef = React.useRef<Set<string>>(new Set())
  React.useEffect(() => {
    const LDBG: any = (typeof window !== 'undefined') ? (window as any).__LOD_DEBUG_LEAF_BUCKETS__ : false
    if (!LDBG) return
    const keys = new Set<string>()
    const collect = (m: Map<string, any>) => { for (const k of m.keys()) keys.add(k) }
    collect(nearBuckets); collect(farBuckets); collect(nearBlendBuckets); collect(farBlendBuckets); collect(farOutBuckets)
    const prev = prevKeysRef.current
    let created = 0, removed = 0
    for (const k of keys) if (!prev.has(k)) created++
    for (const k of prev) if (!keys.has(k)) removed++
    if (created || removed) {
      console.log('[LEAF][buckets] total=%d created=%d removed=%d near=%d far=%d nf=%d fb=%d fout=%d',
        keys.size, created, removed, nearBuckets.size, farBuckets.size, nearBlendBuckets.size, farBlendBuckets.size, farOutBuckets.size)
    }
    prevKeysRef.current = keys
  }, [nearBuckets, farBuckets, nearBlendBuckets, farBlendBuckets, farOutBuckets])

  if (visibleInstances.length === 0) return null

  return (
    <group>
      {/* Near LOD — полная листва */}
      {[...nearBuckets.values()].map((b) => (
        b.key.t === 'sp' ? (
          <LeafSphereChunkMesh key={`near|${keyToString(b.key)}`} bucket={b as any} paletteUuid={paletteUuid} onClick={onClick} onHover={onHover} />
        ) : (
          <LeafBillboardChunkMesh key={`near|${keyToString(b.key)}`} bucket={b as any} paletteUuid={paletteUuid} onClick={onClick} onHover={onHover} />
        )
      ))}

      {/* Near↔Far переход: двойная отрисовка с фейдом — Near с (1-t), Far с t */}
      {[...nearBlendBuckets.values()].map((b) => (
        b.key.t === 'bb' ? (
          <LeafBillboardChunkMesh key={`nf-near|${keyToString(b.key)}`} bucket={b as any} paletteUuid={paletteUuid} fadeByUuid={nearBlendFade} onClick={onClick} onHover={onHover} />
        ) : null
      ))}
      {[...farBlendBuckets.values()].map((b) => (
        b.key.t === 'bb' ? (
          <LeafBillboardChunkMesh key={`nf-far|${keyToString(b.key)}`} bucket={b as any} paletteUuid={paletteUuid} scaleMul={leafScaleMulFar} fadeByUuid={farBlendFade} onClick={onClick} onHover={onHover} />
        ) : null
      ))}

      {/* Far LOD — редуцированные, увеличенные листья */}
      {[...farBuckets.values()].map((b) => (
        b.key.t === 'sp' ? (
          <LeafSphereChunkMesh key={`far|${keyToString(b.key)}`} bucket={b as any} paletteUuid={paletteUuid} scaleMul={leafScaleMulFar} onClick={onClick} onHover={onHover} />
        ) : (
          <LeafBillboardChunkMesh key={`far|${keyToString(b.key)}`} bucket={b as any} paletteUuid={paletteUuid} scaleMul={leafScaleMulFar} onClick={onClick} onHover={onHover} />
        )
      ))}

      {/* Far↔Billboard переход: гасим Far листья (1-t). Билборды включаются отдельно. */}
      {[...farOutBuckets.values()].map((b) => (
        b.key.t === 'bb' ? (
          <LeafBillboardChunkMesh key={`fb|${keyToString(b.key)}`} bucket={b as any} paletteUuid={paletteUuid} scaleMul={leafScaleMulFar} fadeByUuid={farOutFade} onClick={onClick} onHover={onHover} />
        ) : null
      ))}
    </group>
  )
}

export default ChunkedInstancedLeaves
