import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { paletteRegistry } from '@/shared/lib/palette'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import { usePartitionInstancesByLod, defaultTreeLodConfig } from '@/shared/r3f/optimization/treeLod'
import type { SceneLayer, SceneObject, SceneObjectInstance } from '@/entities/scene/types'
import { resolveMaterial, materialToThreePropsWithPalette } from '@/shared/lib/materials'
import { makeLeafPlaneGeometry } from '@/shared/r3f/leaves/makeLeafGeometry'
import { useLeafTextures } from '@/shared/r3f/leaves/useLeafTextures'
import { patchLeafMaterial } from '@/shared/r3f/leaves/patchLeafMaterial'

/**
 * Кеш базовых геометрий для переиспользования между всеми чанками.
 * Создаются один раз при первом использовании и не удаляются до конца сессии.
 * Это предотвращает утечку памяти при пересоздании чанков во время пересчета LOD.
 */
const geometryCache = {
  leafPlane: null as THREE.BufferGeometry | null,
  leafSphere: null as THREE.BufferGeometry | null,
}

/**
 * Возвращает кешированную геометрию плоского листа (billboard).
 * Создается один раз и переиспользуется всеми LeafBillboardChunkMesh.
 */
function getCachedLeafPlaneGeometry(): THREE.BufferGeometry {
  if (!geometryCache.leafPlane) {
    geometryCache.leafPlane = makeLeafPlaneGeometry()
  }
  return geometryCache.leafPlane
}

/**
 * Возвращает кешированную геометрию сферического листа.
 * Создается один раз и переиспользуется всеми LeafSphereChunkMesh.
 */
function getCachedLeafSphereGeometry(): THREE.BufferGeometry {
  if (!geometryCache.leafSphere) {
    geometryCache.leafSphere = new THREE.SphereGeometry(1, 12, 12)
  }
  return geometryCache.leafSphere
}

type LeafShape = 'texture'

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
  shape: LeafShape
  materialUuid: string
  setId?: string
  sprite?: string
  paintFactor?: number
}

type AnyKey = BillboardKey

interface ChunkBucket {
  key: AnyKey
  items: LeafItem[]
}

function keyToString(k: AnyKey): string {
  // Ключ сегмента — строка для Map. Все важные параметры включены для изоляции групп.
  return `bb|${k.cx}|${k.cz}|${k.shape}|${k.materialUuid}|${k.setId || 'def'}|${k.sprite || 'def'}|pf:${k.paintFactor ?? 'na'}`
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

    const shape = 'texture' as LeafShape
    const m = resolveMaterial({
      directMaterial: it.primitive.material,
      objectMaterialUuid: it.primitive.objectMaterialUuid,
      globalMaterialUuid: it.primitive.globalMaterialUuid,
      objectMaterials: it.sceneObject.materials,
    })
    const materialUuid = (m as any)?.uuid || 'default-material'

    const setId = (it.sceneObject as any)?.treeData?.params?.leafTextureSetId as (string | undefined)
    const spriteFromParams = (it.sceneObject as any)?.treeData?.params?.leafTextureSpriteName as (string | undefined)
    const sprite = (spriteFromParams || (it.primitive.geometry as any)?.texSpriteName) as (string | undefined)
    const paintFactor = (it.sceneObject as any)?.treeData?.params?.leafTexturePaintFactor as (number | undefined)
    const key: AnyKey = { t: 'bb', cx, cz, shape: shape as any, materialUuid, setId, sprite, paintFactor }

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

  // Клонируем кешированную базовую геометрию сферы для индивидуального boundingSphere каждого чанка
  const geometry = useMemo(() => getCachedLeafSphereGeometry().clone(), [])

  // Cleanup на unmount: освобождаем клон геометрии и материал
  useEffect(() => {
    return () => {
      try { geometry.dispose() } catch {}
      try { ((meshRef.current?.material as any) as THREE.Material)?.dispose?.() } catch {}
    }
  }, [geometry])

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
const LeafBillboardChunkMeshImpl: React.FC<{
  bucket: ChunkBucket & { key: BillboardKey }
  paletteUuid: string
  scaleMul?: number
  fadeByUuid?: Map<string, number>
  visible?: boolean
  /** Произвольное имя для удобства отладки: попадет в name инстанс‑меша. */
  debugName?: string
  onClick?: (e: any) => void
  onHover?: (e: any) => void
}> = ({ bucket, paletteUuid, scaleMul = 1, fadeByUuid, visible = true, debugName, onClick, onHover }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const bucketRef = useRef(bucket)

  // Обновляем ref при изменении bucket, но не вызываем перерендер
  bucketRef.current = bucket
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
    true,
    spriteNameKey,
    () => (materialRef.current as any)?.userData?.uniforms,
  )

  // Клонируем кешированную базовую геометрию для индивидуальных инстансовых атрибутов (aFade, aLeafPaintMul)
  // Каждый чанк должен иметь свою копию, чтобы атрибуты не конфликтовали между чанками
  const geometry = useMemo(() => getCachedLeafPlaneGeometry().clone(), [])

  // Cleanup на unmount: освобождаем клон геометрии и материал
  useEffect(() => {
    return () => {
      try { geometry.dispose() } catch {}
      try { ((meshRef.current?.material as any) as THREE.Material)?.dispose?.() } catch {}
    }
  }, [geometry])

  // Материал: патч шейдеров листвы
  const onMaterialRef = (mat: THREE.MeshStandardMaterial | null) => {
    if (!mat) return
    materialRef.current = mat
    patchLeafMaterial(mat, {
      shape: 'texture',
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

  // Отслеживаем последние обработанные items и параметры
  const lastProcessedRef = useRef<{
    items: LeafItem[]
    itemsLength: number
    scaleMul: number
    texAspect: number
    anchorUV0: number
    anchorUV1: number
    fadeByUuid?: Map<string, number>
  }>({
    items: [],
    itemsLength: 0,
    scaleMul: 1,
    texAspect: 1,
    anchorUV0: 0.5,
    anchorUV1: 1.0,
  })
  const fadeByUuidRef = useRef(fadeByUuid)
  fadeByUuidRef.current = fadeByUuid

  // Вычисляем матрицы и boundingSphere только при изменении данных
  useFrame(() => {
    // Ранний выход для невидимых компонентов (не делаем никаких проверок)
    if (!visible || !meshRef.current) return
    const bucket = bucketRef.current

    // ИСПРАВЛЕНО: Ранний выход если нет элементов (пустой blend-массив)
    if (!bucket.items || bucket.items.length === 0) return

    // Проверяем, изменились ли items или параметры
    const last = lastProcessedRef.current

    // ОПТИМИЗАЦИЯ: Глубокое сравнение fadeByUuid вместо сравнения ссылок
    let fadeChanged = false
    const currentFade = fadeByUuidRef.current
    const lastFade = last.fadeByUuid
    if (currentFade !== lastFade) {
      // Сравниваем только если ссылки разные
      if (!currentFade || !lastFade || currentFade.size !== lastFade.size) {
        fadeChanged = true
      } else {
        // Проверяем значения fade для элементов текущего bucket
        for (let i = 0; i < bucket.items.length; i++) {
          const uuid = bucket.items[i].instance.uuid
          const currVal = currentFade.get(uuid)
          const lastVal = lastFade.get(uuid)
          if (currVal !== lastVal) {
            fadeChanged = true
            break
          }
        }
      }
    }

    const itemsChanged = (
      last.items !== bucket.items ||
      last.itemsLength !== bucket.items.length ||
      last.scaleMul !== (scaleMul || 1) ||
      last.texAspect !== (texAspect || 1) ||
      last.anchorUV0 !== (anchorUV?.[0] ?? 0.5) ||
      last.anchorUV1 !== (anchorUV?.[1] ?? 1.0) ||
      fadeChanged
    )

    if (!itemsChanged) return // Пропускаем, если ничего не изменилось

    // Сохраняем текущее состояние
    lastProcessedRef.current = {
      items: bucket.items,
      itemsLength: bucket.items.length,
      scaleMul: scaleMul || 1,
      texAspect: texAspect || 1,
      anchorUV0: anchorUV?.[0] ?? 0.5,
      anchorUV1: anchorUV?.[1] ?? 1.0,
      fadeByUuid: fadeByUuidRef.current,
    }

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
      const uniformScale = r * Math.cbrt(Math.abs(isx * isy * isz)) * Math.cbrt(Math.abs(psx * psy * psz)) * (scaleMul || 1)
      const sx = uniformScale * (texAspect || 1)
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
      // ИСПРАВЛЕНО: Фейд с более корректной обработкой
      // Если fadeByUuid передан, берём значение по uuid инстанса
      // Если значения нет в мапе, используем 1 (полная видимость)
      const uuid = instance.uuid
      const fadeValue = fadeByUuidRef.current?.get(uuid)
      fades[k] = fadeValue !== undefined ? Math.max(0, Math.min(1, fadeValue)) : 1

      // После возможного anchor‑смещения используем фактическую Y‑позицию dummy
      const y = dummy.position.y
      minY = Math.min(minY, y - sy)
      maxY = Math.max(maxY, y + sy)
      const dHoriz = Math.hypot(dummy.position.x, dummy.position.z) + Math.max(sx, sz)
      maxR = Math.max(maxR, dHoriz)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    // ВАЖНО: обновляем количество инстансов для отрисовки, чтобы соответствовать длине bucket.items
    // Это устраняет случай, когда InstancedMesh был создан с нулевым/другим количеством
    // и оставался «пустым» после появления элементов без ремаута.
    try { (meshRef.current as any).count = bucket.items.length } catch {}

    // Пер‑инстансовый атрибут aFade - проверяем, существует ли уже, чтобы не пересоздавать без нужды
    const existingFade = meshRef.current.geometry.getAttribute('aFade') as THREE.InstancedBufferAttribute | undefined
    if (!existingFade || existingFade.count !== bucket.items.length) {
      const arr = new Float32Array(fades)
      meshRef.current.geometry.setAttribute('aFade', new THREE.InstancedBufferAttribute(arr, 1))
    } else {
      // Обновляем существующий атрибут
      existingFade.set(fades)
      existingFade.needsUpdate = true
    }

    const centerY = (minY + maxY) * 0.5
    const vertRad = (maxY - minY) * 0.5
    let boundRad = Math.max(maxR, vertRad)
    // ИСПРАВЛЕНО: Увеличен запас для billboards, которые поворачиваются к камере
    // При повороте billboard эффективный радиус может увеличиться до √2 ≈ 1.41
    boundRad *= 1.5 // было 1.06 - увеличено для предотвращения culling при поворотах
    meshRef.current.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, centerY, 0), boundRad)

    // Обновляем aLeafPaintMul
    const g = meshRef.current.geometry as THREE.BufferGeometry
    const existingPaintMul = g.getAttribute('aLeafPaintMul') as THREE.InstancedBufferAttribute | undefined
    const arrPaint = new Float32Array(bucket.items.length)

    for (let k = 0; k < bucket.items.length; k++) {
      const { sceneObject, primitive, instance } = bucket.items[k]
      const jitter = (sceneObject as any)?.treeData?.params?.leafTexturePaintJitter ?? 0
      const primUuid = (primitive as any)?.uuid || String(k)
      const instUuid = (instance as any)?.uuid || String(k)
      const rnd = hashToUnit(String(instUuid + '/' + primUuid))
      const mul = 1 - Math.max(0, Math.min(1, jitter)) * rnd
      arrPaint[k] = mul
    }

    if (!existingPaintMul || existingPaintMul.count !== bucket.items.length) {
      g.setAttribute('aLeafPaintMul', new THREE.InstancedBufferAttribute(arrPaint, 1))
    } else {
      existingPaintMul.set(arrPaint)
      existingPaintMul.needsUpdate = true
    }
  })

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
    const uniforms = (materialRef.current as any)?.userData?.uniforms
    if (!uniforms) return
    if (uniforms.uLeafPaintFactor) uniforms.uLeafPaintFactor.value = paintFactor
    if (uniforms.uLeafTargetColor) uniforms.uLeafTargetColor.value.set(targetLeafColorLinear.r, targetLeafColorLinear.g, targetLeafColorLinear.b)
  }, [paintFactor, targetLeafColorLinear])

  if (bucket.items.length === 0) return null
  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry as any, undefined as any, bucket.items.length]}
      position={[bucket.key.cx, 0, bucket.key.cz]}
      name={debugName || `LeafChunkMesh [${bucket.key.cx},${bucket.key.cz}] sprite:${spriteNameKey} set:${bucket.key.setId || 'def'} mat:${bucket.key.materialUuid}`}
      visible={visible}
      // В отладочном режиме отключаем фрустум‑куллинг, чтобы исключить ошибки границ
      frustumCulled={false}
      castShadow
      onClick={handleClick}
      onPointerOver={handleHover}
    >
      <meshStandardMaterial
        key={`leafMat-${spriteNameKey}-${!!diffuseMap}-${paletteUuid}`}
        ref={onMaterialRef}
        {...materialProps}
        envMapIntensity={1}
        color={'#FFFFFF'}
        map={diffuseMap || undefined}
        alphaMap={alphaMap || undefined}
        normalMap={normalMap || undefined}
        roughnessMap={roughnessMap || undefined}
        // В переходных окнах Near↔Far и Far↔Billboard два набора отрисовываются одновременно.
        // Чтобы дизер-фейд работал корректно и наборы не «глушили» друг друга по Z,
        // отключаем запись в depth для blend‑вариантов (признак — передан fadeByUuid).
        depthWrite={!!fadeByUuid ? false : true}
        transparent={false}
        alphaTest={!!diffuseMap ? 0.5 : 0.0}
        alphaToCoverage={true}
    />
    </instancedMesh>
  )
}

/**
 * Мемоизированная версия LeafBillboardChunkMesh.
 * Компонент НЕ перерендеривается при изменении bucket.items - только при изменении ключа или видимости.
 * Это устраняет мерцание при пересчете LOD.
 */
const LeafBillboardChunkMesh = React.memo(LeafBillboardChunkMeshImpl, (prev, next) => {
  // Перерендер только если изменились критичные пропсы
  return (
    prev.paletteUuid === next.paletteUuid &&
    prev.scaleMul === next.scaleMul &&
    prev.visible === next.visible &&
    prev.onClick === next.onClick &&
    prev.onHover === next.onHover &&
    keyToString(prev.bucket.key) === keyToString(next.bucket.key) &&
    // РАЗРЕШАЕМ перерендер, когда меняется количество элементов/карта фейдов.
    prev.bucket.items.length === next.bucket.items.length &&
    ((prev.fadeByUuid?.size || 0) === (next.fadeByUuid?.size || 0))
  )
})

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
    // Полная схема LOD с near↔far↔billboard
    // Временная отладка: увеличиваем аппроксимацию высоты дерева,
    // чтобы переход к near происходил раньше при приближении
    approximateTreeHeightWorld: 18,
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

  // Стабильная Map чанков - сохраняет ссылки на объекты между рендерами
  const allBucketsUnifiedRef = React.useRef(new Map<string, {
    key: AnyKey
    nearItems?: LeafItem[]
    nearBlendItems?: LeafItem[]
    farBlendItems?: LeafItem[]
    farItems?: LeafItem[]
    farOutItems?: LeafItem[]
    nearBlendFade?: Map<string, number>
    farBlendFade?: Map<string, number>
    farOutFade?: Map<string, number>
  }>())

  // Обновляем содержимое стабильной Map (объекты unified НЕ пересоздаются, только обновляются)
  const allBucketsUnified = useMemo(() => {
    const map = allBucketsUnifiedRef.current

    // Удаляем чанки, которых больше нет
    const allCurrentKeys = new Set<string>()
    const collectKeys = (buckets: Map<string, ChunkBucket>) => {
      for (const ks of buckets.keys()) allCurrentKeys.add(ks)
    }
    collectKeys(nearBuckets)
    collectKeys(nearBlendBuckets)
    collectKeys(farBlendBuckets)
    collectKeys(farBuckets)
    collectKeys(farOutBuckets)

    for (const ks of map.keys()) {
      if (!allCurrentKeys.has(ks)) map.delete(ks)
    }

    // Обновляем/добавляем чанки
    const addToBucket = (buckets: Map<string, ChunkBucket>, type: 'near' | 'nearBlend' | 'farBlend' | 'far' | 'farOut') => {
      for (const [ks, bucket] of buckets.entries()) {
        if (!map.has(ks)) {
          map.set(ks, { key: bucket.key })
        }
        const unified = map.get(ks)!
        // Обновляем key на случай изменений
        unified.key = bucket.key
        // Обновляем items для соответствующего LOD-уровня
        if (type === 'near') unified.nearItems = bucket.items
        else if (type === 'nearBlend') unified.nearBlendItems = bucket.items
        else if (type === 'farBlend') unified.farBlendItems = bucket.items
        else if (type === 'far') unified.farItems = bucket.items
        else if (type === 'farOut') unified.farOutItems = bucket.items
      }
    }

    // Сбрасываем все items перед обновлением
    for (const unified of map.values()) {
      unified.nearItems = undefined
      unified.nearBlendItems = undefined
      unified.farBlendItems = undefined
      unified.farItems = undefined
      unified.farOutItems = undefined
    }

    addToBucket(nearBuckets, 'near')
    addToBucket(nearBlendBuckets, 'nearBlend')
    addToBucket(farBlendBuckets, 'farBlend')
    addToBucket(farBuckets, 'far')
    addToBucket(farOutBuckets, 'farOut')

    // Добавляем карты фейда
    for (const unified of map.values()) {
      unified.nearBlendFade = unified.nearBlendItems ? nearBlendFade : undefined
      unified.farBlendFade = unified.farBlendItems ? farBlendFade : undefined
      unified.farOutFade = unified.farOutItems ? farOutFade : undefined
    }

    return map
  }, [nearBuckets, farBuckets, nearBlendBuckets, farBlendBuckets, farOutBuckets, nearBlendFade, farBlendFade, farOutFade])

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

  // Отладка видимости LOD-уровней
  React.useEffect(() => {
    const LDBG: any = (typeof window !== 'undefined') ? (window as any).__LOD_DEBUG_LEAF_BUCKETS__ : false
    if (!LDBG) return
    let nearVisible = 0, nearBlendVisible = 0, farBlendVisible = 0, farVisible = 0, farOutVisible = 0
    for (const unified of allBucketsUnified.values()) {
      const hasNear = !!unified.nearItems && unified.nearItems.length > 0
      const hasNearBlend = !!unified.nearBlendItems && unified.nearBlendItems.length > 0
      const hasFarBlend = !!unified.farBlendItems && unified.farBlendItems.length > 0
      const hasFar = !!unified.farItems && unified.farItems.length > 0
      const hasFarOut = !!unified.farOutItems && unified.farOutItems.length > 0

      const isNearActive = hasNear && !hasNearBlend
      const isNearBlendActive = hasNearBlend
      const isFarBlendActive = hasFarBlend
      const isFarActive = hasFar && !hasNearBlend && !hasFarOut
      const isFarOutActive = hasFarOut

      if (isNearActive) nearVisible++
      if (isNearBlendActive) nearBlendVisible++
      if (isFarBlendActive) farBlendVisible++
      if (isFarActive) farVisible++
      if (isFarOutActive) farOutVisible++
    }
    if (nearVisible || nearBlendVisible || farBlendVisible || farVisible || farOutVisible) {
      console.log('[LEAF][visibility] near=%d nearBlend=%d farBlend=%d far=%d farOut=%d',
        nearVisible, nearBlendVisible, farBlendVisible, farVisible, farOutVisible)
    }
  }, [allBucketsUnified])

  if (visibleInstances.length === 0) return null

  return (
    <group name="LeafChunks">
      {/* Унифицированный рендер всех чанков со стабильными ключами.
          Все LOD-компоненты остаются смонтированными, переключаются через visible.
          Это устраняет мерцание при пересчете LOD. */}
      {[...allBucketsUnified.entries()].map(([ks, unified]) => {
        const hasNear = !!unified.nearItems && unified.nearItems.length > 0
        const hasNearBlend = !!unified.nearBlendItems && unified.nearBlendItems.length > 0
        const hasFarBlend = !!unified.farBlendItems && unified.farBlendItems.length > 0
        const hasFar = !!unified.farItems && unified.farItems.length > 0
        const hasFarOut = !!unified.farOutItems && unified.farOutItems.length > 0

        // Если чанк никогда не был заполнен, пропускаем
        if (!hasNear && !hasNearBlend && !hasFarBlend && !hasFar && !hasFarOut) {
          return null
        }

        // ИСПРАВЛЕНО: Каждый LOD-уровень показывается ВСЕГДА когда есть элементы
        // Логика: инстансы попадают ЛИБО в solid-набор, ЛИБО в blend-набор (взаимоисключающе)
        // Поэтому нет конфликтов - каждый набор рисуется независимо
        const isNearActive = hasNear
        const isNearBlendActive = hasNearBlend
        const isFarBlendActive = hasFarBlend
        const isFarActive = hasFar
        const isFarOutActive = hasFarOut

        return (
          <group key={ks} name={`LeafChunkGroup [${unified.key.cx},${unified.key.cz}] sprite:${unified.key.sprite || 'def'} set:${unified.key.setId || 'def'} mat:${(unified.key as any).materialUuid}`}>
            {/* Near LOD - показываем когда есть элементы и нет перехода */}
            {hasNear && (
              <LeafBillboardChunkMesh
                key="near"
                bucket={{ key: unified.key, items: unified.nearItems! } as any}
                paletteUuid={paletteUuid}
                debugName={`LeafChunkMesh near [${unified.key.cx},${unified.key.cz}] sprite:${unified.key.sprite || 'def'} set:${unified.key.setId || 'def'} mat:${(unified.key as any).materialUuid}`}
                visible={isNearActive}
                onClick={onClick}
                onHover={onHover}
              />
            )}

            {/* Near↔Far blend: near component - показываем только если есть элементы */}
            {hasNearBlend && (
              <LeafBillboardChunkMesh
                key="nearBlend"
                bucket={{ key: unified.key, items: unified.nearBlendItems! } as any}
                paletteUuid={paletteUuid}
                fadeByUuid={unified.nearBlendFade}
                debugName={`LeafChunkMesh nearBlend [${unified.key.cx},${unified.key.cz}] sprite:${unified.key.sprite || 'def'} set:${unified.key.setId || 'def'} mat:${(unified.key as any).materialUuid}`}
                visible={isNearBlendActive && unified.key.t === 'bb'}
                onClick={onClick}
                onHover={onHover}
              />
            )}

            {/* Near↔Far blend: far component - показываем только если есть элементы */}
            {hasFarBlend && (
              <LeafBillboardChunkMesh
                key="farBlend"
                bucket={{ key: unified.key, items: unified.farBlendItems! } as any}
                paletteUuid={paletteUuid}
                scaleMul={leafScaleMulFar}
                fadeByUuid={unified.farBlendFade}
                debugName={`LeafChunkMesh farBlend [${unified.key.cx},${unified.key.cz}] sprite:${unified.key.sprite || 'def'} set:${unified.key.setId || 'def'} mat:${(unified.key as any).materialUuid}`}
                visible={isFarBlendActive && unified.key.t === 'bb'}
                onClick={onClick}
                onHover={onHover}
              />
            )}

            {/* Far LOD - показываем когда есть элементы и нет переходов */}
            {hasFar && (
              <LeafBillboardChunkMesh
                key="far"
                bucket={{ key: unified.key, items: unified.farItems! } as any}
                paletteUuid={paletteUuid}
                scaleMul={leafScaleMulFar}
                debugName={`LeafChunkMesh far [${unified.key.cx},${unified.key.cz}] sprite:${unified.key.sprite || 'def'} set:${unified.key.setId || 'def'} mat:${(unified.key as any).materialUuid}`}
                visible={isFarActive}
                onClick={onClick}
                onHover={onHover}
              />
            )}

            {/* Far↔Billboard blend - показываем только если есть элементы */}
            {hasFarOut && (
              <LeafBillboardChunkMesh
                key="farOut"
                bucket={{ key: unified.key, items: unified.farOutItems! } as any}
                paletteUuid={paletteUuid}
                scaleMul={leafScaleMulFar}
                fadeByUuid={unified.farOutFade}
                debugName={`LeafChunkMesh farOut [${unified.key.cx},${unified.key.cz}] sprite:${unified.key.sprite || 'def'} set:${unified.key.setId || 'def'} mat:${(unified.key as any).materialUuid}`}
                visible={isFarOutActive && unified.key.t === 'bb'}
                onClick={onClick}
                onHover={onHover}
              />
            )}
          </group>
        )
      })}
    </group>
  )
}

export default ChunkedInstancedLeaves
