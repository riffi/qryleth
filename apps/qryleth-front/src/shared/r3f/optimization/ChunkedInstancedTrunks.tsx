import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { SceneLayer, SceneObject, SceneObjectInstance } from '@/entities/scene/types'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import { paletteRegistry } from '@/shared/lib/palette'
import { resolveMaterial, materialToThreePropsWithPalette } from '@/shared/lib/materials'
import { woodTextureRegistry, initializeWoodTextures } from '@/shared/lib/textures'

interface TrunkItem {
  sceneObject: SceneObject
  instance: SceneObjectInstance
  primitive: any // ожидается mesh-примитив единого ствола
}

interface ChunkKey {
  cx: number
  cz: number
  objectUuid: string
  paletteUuid: string
}

interface ChunkBucket {
  key: ChunkKey
  items: TrunkItem[]
}

function keyOf(k: ChunkKey): string { return `${k.cx}|${k.cz}|${k.objectUuid}|${k.paletteUuid}` }

/**
 * Проверяет полную видимость инстанса: слой, объект, инстанс.
 */
function isInstanceVisible(instance: SceneObjectInstance, object: SceneObject, layers: SceneLayer[]): boolean {
  const layerId = object.layerId || 'objects'
  const layer = layers.find(l => l.id === layerId)
  const isLayerVisible = layer ? layer.visible : true
  const isObjectVisible = object.visible !== false
  const isInstanceVisible = instance.visible !== false
  return isLayerVisible && isObjectVisible && isInstanceVisible
}

/**
 * Вычисляет итоговую трансформацию примитива как дочернего узла инстанса.
 * Возвращает позицию/поворот/масштаб в мировых координатах.
 *
 * Формулы соответствуют логике InstancedObjects.combineTransforms.
 */
function combineTransforms(
  instanceTransform: { position?: number[], rotation?: number[], scale?: number[] },
  primitiveTransform: { position?: number[], rotation?: number[], scale?: number[] }
): { position: [number, number, number], quaternion: THREE.Quaternion, scale: [number, number, number] } {
  const [ix, iy, iz] = instanceTransform.position || [0, 0, 0]
  const [irx, iry, irz] = instanceTransform.rotation || [0, 0, 0]
  const [isx, isy, isz] = instanceTransform.scale || [1, 1, 1]

  const [px, py, pz] = primitiveTransform.position || [0, 0, 0]
  const [prx, pry, prz] = primitiveTransform.rotation || [0, 0, 0]
  const [psx, psy, psz] = primitiveTransform.scale || [1, 1, 1]

  const qInst = new THREE.Quaternion().setFromEuler(new THREE.Euler(irx, iry, irz, 'XYZ'))
  const qPrim = new THREE.Quaternion().setFromEuler(new THREE.Euler(prx, pry, prz, 'XYZ'))
  const qFinal = new THREE.Quaternion().copy(qInst).multiply(qPrim)

  const vLocal = new THREE.Vector3(px, py, pz)
  vLocal.multiply(new THREE.Vector3(isx, isy, isz))
  vLocal.applyQuaternion(qInst)
  vLocal.add(new THREE.Vector3(ix, iy, iz))

  return {
    position: [vLocal.x, vLocal.y, vLocal.z],
    quaternion: qFinal,
    scale: [isx * psx, isy * psy, isz * psz]
  }
}

/**
 * Компонент‑агрегатор: сегментированный по сцене рендер единых стволов деревьев (mesh‑примитив).
 *
 * - Выбирает только объекты с treeData.params и mesh‑примитивом (единый ствол);
 * - Бакетизирует инстансы по чанкам XZ (по умолчанию 32 м) и рендерит на чанк InstancedMesh;
 * - Для каждого чанка считает корректный boundingSphere, чтобы исключить «пропадания» при движении камеры;
 * - Материалы коры настраиваются через woodTextureRegistry аналогично Object/Scene рендеру.
 */
export const ChunkedInstancedTrunks: React.FC<{
  objects: SceneObject[]
  instances: SceneObjectInstance[]
  layers: SceneLayer[]
  chunkSize?: number
  onClick?: (e: any) => void
  onHover?: (e: any) => void
}> = ({ objects, instances, layers, chunkSize = 32, onClick, onHover }) => {
  // Ленивая инициализация набора текстур коры
  if (woodTextureRegistry.size === 0) {
    try { initializeWoodTextures() } catch {}
  }

  const paletteUuid = useSceneStore(s => s.environmentContent?.paletteUuid || 'default')
  const objectsById = useMemo(() => new Map(objects.map(o => [o.uuid, o])), [objects])

  // Собираем стволы (mesh) только у объектов с treeData.params
  const trunkItems = useMemo<TrunkItem[]>(() => {
    const out: TrunkItem[] = []
    for (const inst of instances) {
      const obj = objectsById.get(inst.objectUuid)
      if (!obj) continue
      if (!isInstanceVisible(inst, obj, layers)) continue
      if (!(obj as any)?.treeData?.params) continue
      for (const p of (obj.primitives || [])) {
        if (p.type !== 'mesh') continue
        out.push({ sceneObject: obj, instance: inst, primitive: p })
      }
    }
    return out
  }, [instances, objectsById, layers])

  // Бакетизация по чанкам + objectUuid (геометрия ствола специфична для объекта)
  const buckets = useMemo(() => {
    const map = new Map<string, ChunkBucket>()
    const half = chunkSize * 0.5
    for (const it of trunkItems) {
      const pos = it.instance.transform?.position || [0,0,0]
      const cx = Math.floor(pos[0] / chunkSize) * chunkSize + half
      const cz = Math.floor(pos[2] / chunkSize) * chunkSize + half
      const key: ChunkKey = { cx, cz, objectUuid: it.sceneObject.uuid, paletteUuid }
      const ks = keyOf(key)
      let b = map.get(ks)
      if (!b) { b = { key, items: [] }; map.set(ks, b) }
      b.items.push(it)
    }
    return [...map.values()]
  }, [trunkItems, chunkSize, paletteUuid])

  if (buckets.length === 0) return null
  return (
    <group name="TrunkChunks">
      {buckets.map((b) => (
        <TrunkChunkMesh key={keyOf(b.key)} bucket={b} paletteUuid={paletteUuid} onClick={onClick} onHover={onHover} />
      ))}
    </group>
  )
}

/**
 * Отрисовывает один чанк единых стволов для конкретного объекта.
 * Загружает карты коры на основе treeData.params.* и формирует матрицы инстансов.
 */
const TrunkChunkMesh: React.FC<{
  bucket: ChunkBucket
  paletteUuid: string
  onClick?: (e: any) => void
  onHover?: (e: any) => void
}> = ({ bucket, paletteUuid, onClick, onHover }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const sample = bucket.items[0]
  const activePalette = paletteRegistry.get(paletteUuid) || paletteRegistry.get('default')

  // Геометрия из примитива (единый меш)
  const geometry = useMemo(() => {
    const p = sample.primitive
    const g = new THREE.BufferGeometry()
    if (p.geometry?.positions) g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p.geometry.positions), 3))
    if (p.geometry?.normals && p.geometry.normals.length === p.geometry.positions?.length) {
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(p.geometry.normals), 3))
    } else {
      g.computeVertexNormals()
    }
    if (p.geometry?.uvs) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(p.geometry.uvs), 2))
    if (p.geometry?.indices) g.setIndex(p.geometry.indices)
    g.computeBoundingBox(); g.computeBoundingSphere()
    return g
  }, [sample])

  // Cleanup: освобождаем геометрию и материал на unmount
  useEffect(() => {
    return () => {
      try { (meshRef.current?.geometry as any)?.dispose?.() } catch {}
      try { ((meshRef.current?.material as any) as THREE.Material)?.dispose?.() } catch {}
    }
  }, [])

  // Материал: из материала примитива + карты коры из реестра, как в обычном рендере
  const materialProps = useMemo(() => {
    const matDef = resolveMaterial({
      directMaterial: sample.primitive.material,
      objectMaterialUuid: sample.primitive.objectMaterialUuid,
      globalMaterialUuid: sample.primitive.globalMaterialUuid,
      objectMaterials: sample.sceneObject.materials,
    })
    return materialToThreePropsWithPalette(matDef, activePalette as any)
  }, [sample, activePalette])

  const bark = useMemo(() => {
    const params: any = (sample.sceneObject as any)?.treeData?.params || {}
    const id: string | undefined = params.barkTextureSetId
    const set = (id && woodTextureRegistry.get(id)) || woodTextureRegistry.list()[0]
    const ru: number = params.barkUvRepeatU ?? 1
    const rv: number = params.barkUvRepeatV ?? 1
    return { set, ru, rv }
  }, [sample])

  const [colorMap, setColorMap] = React.useState<THREE.Texture | null>(null)
  const [normalMap, setNormalMap] = React.useState<THREE.Texture | null>(null)
  const [roughnessMap, setRoughnessMap] = React.useState<THREE.Texture | null>(null)
  const [aoMap, setAoMap] = React.useState<THREE.Texture | null>(null)
  const matRef = React.useRef<THREE.MeshStandardMaterial | null>(null)

  // Загрузка карт коры
  React.useEffect(() => {
    const set = bark.set
    if (!set) return
    const loader = new THREE.TextureLoader()
    const onTex = (t: THREE.Texture | null) => {
      if (!t) return
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(Math.max(0.05, bark.ru || 1), Math.max(0.05, bark.rv || 1))
      t.anisotropy = 4
      t.needsUpdate = true
    }
    if (set.colorMapUrl) loader.load(set.colorMapUrl, (t) => { onTex(t); (t as any).colorSpace = (THREE as any).SRGBColorSpace || (t as any).colorSpace; setColorMap(t) })
    if (set.normalMapUrl) loader.load(set.normalMapUrl, (t) => { onTex(t); setNormalMap(t) })
    else setNormalMap(null)
    if (set.roughnessMapUrl) loader.load(set.roughnessMapUrl, (t) => { onTex(t); setRoughnessMap(t) })
    else setRoughnessMap(null)
    if (set.aoMapUrl) loader.load(set.aoMapUrl, (t) => { onTex(t); setAoMap(t) })
    else setAoMap(null)
  }, [bark])

  React.useEffect(() => { if (matRef.current) matRef.current.needsUpdate = true }, [colorMap, normalMap, roughnessMap, aoMap])

  // Заполнение матриц и расчёт boundingSphere чанка
  useEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    const g = geometry
    g.computeBoundingBox(); g.computeBoundingSphere()
    const bb = g.boundingBox || new THREE.Box3(new THREE.Vector3(), new THREE.Vector3())
    const min0 = bb.min.clone(), max0 = bb.max.clone()
    // 8 углов бокса геометрии в локальных координатах геометрии
    const corners = [
      new THREE.Vector3(min0.x, min0.y, min0.z), new THREE.Vector3(max0.x, min0.y, min0.z),
      new THREE.Vector3(min0.x, max0.y, min0.z), new THREE.Vector3(max0.x, max0.y, min0.z),
      new THREE.Vector3(min0.x, min0.y, max0.z), new THREE.Vector3(max0.x, min0.y, max0.z),
      new THREE.Vector3(min0.x, max0.y, max0.z), new THREE.Vector3(max0.x, max0.y, max0.z),
    ]

    let minY = Number.POSITIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    let maxR = 0
    const m = new THREE.Matrix4()

    for (let k = 0; k < bucket.items.length; k++) {
      const it = bucket.items[k]
      const instT = it.instance.transform || {}
      const primT = it.primitive.transform || {}
      const tr = combineTransforms(instT, primT)

      // Переход к локальным координатам чанка
      const lx = tr.position[0] - bucket.key.cx
      const ly = tr.position[1]
      const lz = tr.position[2] - bucket.key.cz

      dummy.position.set(lx, ly, lz)
      dummy.quaternion.copy(tr.quaternion)
      dummy.scale.set(tr.scale[0], tr.scale[1], tr.scale[2])
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(k, dummy.matrix)

      // Матрица трансформации для оценки габаритов
      m.compose(dummy.position, dummy.quaternion, dummy.scale)
      for (let c = 0; c < 8; c++) {
        const p = corners[c].clone().applyMatrix4(m)
        minY = Math.min(minY, p.y)
        maxY = Math.max(maxY, p.y)
        const dHoriz = Math.hypot(p.x, p.z)
        maxR = Math.max(maxR, dHoriz)
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true

    const centerY = (minY + maxY) * 0.5
    const vertRad = (maxY - minY) * 0.5
    const boundRad = Math.max(maxR, vertRad) * 1.05 // небольшой запас
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, centerY, 0), Math.max(0.001, boundRad))
  }, [bucket.items, bucket.key.cx, bucket.key.cz, geometry])

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
      name={`TrunkChunk [${bucket.key.cx},${bucket.key.cz}] obj:${bucket.key.objectUuid} count:${bucket.items.length}`}
      castShadow
      receiveShadow
      onClick={handleClick}
      onPointerOver={handleHover}
    >
      <meshStandardMaterial
        ref={matRef as any}
        {...materialProps}
        color={colorMap ? '#ffffff' : (materialProps as any).color}
        map={colorMap || undefined}
        normalMap={normalMap || undefined}
        roughnessMap={roughnessMap || undefined}
        aoMap={aoMap || undefined}
      />
    </instancedMesh>
  )
}

export default ChunkedInstancedTrunks
