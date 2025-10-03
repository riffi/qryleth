import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { paletteRegistry } from '@/shared/lib/palette'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import type { SceneLayer, SceneObject, SceneObjectInstance } from '@/entities/scene/types'
import { resolveMaterial, materialToThreePropsWithPalette } from '@/shared/lib/materials'
import { usePartitionGrassByLod } from '@/shared/r3f/optimization/grassLod'

interface GrassItem {
  sceneObject: SceneObject
  instance: SceneObjectInstance
  primitive: any // ожидается mesh-примитив пучка травы
}

interface ChunkKey {
  cx: number
  cz: number
  objectUuid: string
  paletteUuid: string
}

interface ChunkBucket {
  key: ChunkKey
  items: GrassItem[]
}

function keyOf(k: ChunkKey): string { return `${k.cx}|${k.cz}|${k.objectUuid}|${k.paletteUuid}` }

/** Полная видимость инстанса с учётом слоя/объекта/инстанса и скрытых биомов */
function isInstanceVisible(
  instance: SceneObjectInstance,
  object: SceneObject,
  layers: SceneLayer[],
  hiddenBiomeUuids?: Set<string>,
): boolean {
  const layerId = object.layerId || 'objects'
  const layer = layers.find(l => l.id === layerId)
  const isLayerVisible = layer ? layer.visible : true
  const isObjectVisible = object.visible !== false
  const isInstanceVisible = instance.visible !== false
  const biomeVisible = !instance.biomeUuid || !(hiddenBiomeUuids && hiddenBiomeUuids.has(instance.biomeUuid))
  return isLayerVisible && isObjectVisible && isInstanceVisible && biomeVisible
}

/** Комбинация трансформаций инстанса и примитива (как child узел) */
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
 * Сценовый агрегатор травы: инстансирует пучки травы по чанкам XZ.
 * Группировка по: центр чанка, UUID объекта (геометрия специфична), активная палитра.
 */
export const ChunkedInstancedGrass: React.FC<{
  objects: SceneObject[]
  instances: SceneObjectInstance[]
  layers: SceneLayer[]
  chunkSize?: number
  onClick?: (e: any) => void
  onHover?: (e: any) => void
}> = ({ objects, instances, layers, chunkSize = 64, onClick, onHover }) => {
  const paletteUuid = useSceneStore(s => s.environmentContent?.paletteUuid || 'default')
  const objectsById = useMemo(() => new Map(objects.map(o => [o.uuid, o])), [objects])
  const biomes = useSceneStore(s => s.biomes)
  const hiddenBiomeUuids = useMemo(() => new Set((biomes || []).filter(b => b.visible === false).map(b => b.uuid)), [biomes])

  // Валидация видимости и принадлежности к траве
  const visibleGrassInstances = useMemo(() => instances.filter(inst => {
    const obj = objectsById.get(inst.objectUuid)
    if (!obj) return false
    if (!isInstanceVisible(inst, obj, layers, hiddenBiomeUuids)) return false
    return (obj as any).objectType === 'grass'
  }), [instances, objectsById, layers, hiddenBiomeUuids])

  // Разделяем по LOD: в этом компоненте оставляем только ближние (Near)
  const lodCfg = useSceneStore(s => s.grassLodConfig)
  const { nearSolid } = usePartitionGrassByLod(visibleGrassInstances, {
    enabled: lodCfg.enabled,
    nearInPx: lodCfg.nearInPx,
    nearOutPx: lodCfg.nearOutPx,
    approximateGrassHeightWorld: 1.0,
  })

  const nearInstances = nearSolid || []

  // Собираем пучки травы (mesh) только для Near
  const grassItems = useMemo<GrassItem[]>(() => {
    const mapInst = new Set(nearInstances.map(i => i.uuid))
    const out: GrassItem[] = []
    for (const inst of nearInstances) {
      const obj = objectsById.get(inst.objectUuid)
      if (!obj) continue
      for (const p of (obj.primitives || [])) {
        if (p.type !== 'mesh') continue
        out.push({ sceneObject: obj, instance: inst, primitive: p })
      }
    }
    return out
  }, [nearInstances, objectsById])

  // Бакетизация по чанкам + objectUuid
  const buckets = useMemo(() => {
    const map = new Map<string, ChunkBucket>()
    const half = chunkSize * 0.5
    for (const it of grassItems) {
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
  }, [grassItems, chunkSize, paletteUuid])

  if (buckets.length === 0) return null
  return (
    <group name="GrassChunks">
      {buckets.map((b) => (
        <GrassChunkMesh key={keyOf(b.key)} bucket={b} paletteUuid={paletteUuid} onClick={onClick} onHover={onHover} />
      ))}
    </group>
  )
}

/** Один чанк травы (InstancedMesh) для конкретного объекта */
const GrassChunkMesh: React.FC<{
  bucket: ChunkBucket
  paletteUuid: string
  onClick?: (e: any) => void
  onHover?: (e: any) => void
}> = ({ bucket, paletteUuid, onClick, onHover }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  const sample = bucket.items[0]
  const activePalette = paletteRegistry.get(paletteUuid) || paletteRegistry.get('default')

  // Геометрия из примитива травы (единый меш лент)
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

  // Очистка ресурсов при размонтировании
  useEffect(() => {
    return () => {
      try { (meshRef.current?.geometry as any)?.dispose?.() } catch {}
      try { ((meshRef.current?.material as any) as THREE.Material)?.dispose?.() } catch {}
    }
  }, [])

  // Материал из материала объекта/примитива (однотонный)
  const materialProps = useMemo(() => {
    const matDef = resolveMaterial({
      directMaterial: sample.primitive.material,
      objectMaterialUuid: sample.primitive.objectMaterialUuid,
      globalMaterialUuid: sample.primitive.globalMaterialUuid,
      objectMaterials: sample.sceneObject.materials,
    })
    return materialToThreePropsWithPalette(matDef, activePalette as any)
  }, [sample, activePalette])

  /**
   * Лёгкое ветровое покачивание для LOD1 (near):
   * Вершины смещаются в плоскости XZ по синусоиде с малой амплитудой.
   * Направление и скорость берутся из стора окружения (ветер).
   */
  const wind = useSceneStore(s => s.environmentContent?.wind)
  const uniformsRef = useRef({
    uTime: { value: 0 },
    uWindDir: { value: new THREE.Vector2(1, 0) },
    uAmp: { value: 0.03 },
    uFreq: { value: 0.7 },
    uSpeed: { value: 1.0 },
    uBend: { value: 0.7 },
  })

  useEffect(() => {
    const mat = materialRef.current as any
    if (!mat) return
    // Граница по Y из геометрии для нормализации высоты
    geometry.computeBoundingBox()
    const bb = geometry.boundingBox || new THREE.Box3(new THREE.Vector3(), new THREE.Vector3())
    const minY = bb.min.y
    const height = Math.max(1e-3, bb.max.y - bb.min.y)

    mat.onBeforeCompile = (shader: any) => {
      shader.uniforms.uTime = uniformsRef.current.uTime
      shader.uniforms.uWindDir = uniformsRef.current.uWindDir
      shader.uniforms.uAmp = uniformsRef.current.uAmp
      shader.uniforms.uFreq = uniformsRef.current.uFreq
      shader.uniforms.uSpeed = uniformsRef.current.uSpeed
      shader.uniforms.uBend = uniformsRef.current.uBend
      shader.uniforms.uMinY = { value: minY }
      shader.uniforms.uHeight = { value: height }

      shader.vertexShader = shader.vertexShader
        .replace(
          'void main() {',
          `uniform float uTime;\nuniform vec2 uWindDir;\nuniform float uAmp;\nuniform float uFreq;\nuniform float uSpeed;\nuniform float uBend;\nuniform float uMinY;\nuniform float uHeight;\nvoid main() {`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>\n  // Смещение по ветру только у вершинок: основание остаётся на месте.\n  // Нормализуем высоту вершины в пределах геометрии чанка.\n  float hRel = clamp((transformed.y - uMinY) / max(1e-3, uHeight), 0.0, 1.0);\n  // Увеличиваем вклад к верхушкам (плавнее у основания):
  float hPow = pow(hRel, 1.6);
  vec2 windDir = normalize(uWindDir);
  float phase = dot(transformed.xz, windDir * uFreq) + uTime * uSpeed;\n  float a = uAmp * (uBend * hPow);\n  transformed.xz += windDir * (sin(phase) * a);`
        )
    }
    mat.needsUpdate = true
  }, [])

  useFrame((state) => {
    // Обновляем uniforms: время и ветер из стора
    uniformsRef.current.uTime.value = state.clock.getElapsedTime()
    const dir = wind?.direction || [1, 0]
    const len = Math.hypot(dir[0], dir[1]) || 1
    uniformsRef.current.uWindDir.value.set(dir[0] / len, dir[1] / len)
    const spd = Math.max(0, Number(wind?.speed ?? 0.2))
    // Лёгкое покачивание: небольшая амплитуда, умеренная частота и скорость
    uniformsRef.current.uAmp.value = Math.min(0.07, 0.02 + 0.05 * spd)
    uniformsRef.current.uFreq.value = 0.6 + 0.4 * spd
    uniformsRef.current.uSpeed.value = 0.8 + 1.2 * spd
    uniformsRef.current.uBend.value = 0.6
  })

  // Заполняем матрицы и рассчитываем boundingSphere чанка
  useEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    const g = geometry
    g.computeBoundingBox(); g.computeBoundingSphere()
    const bb = g.boundingBox || new THREE.Box3(new THREE.Vector3(), new THREE.Vector3())
    const min0 = bb.min.clone(), max0 = bb.max.clone()
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

      const lx = tr.position[0] - bucket.key.cx
      const ly = tr.position[1]
      const lz = tr.position[2] - bucket.key.cz

      dummy.position.set(lx, ly, lz)
      dummy.quaternion.copy(tr.quaternion)
      dummy.scale.set(tr.scale[0], tr.scale[1], tr.scale[2])
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(k, dummy.matrix)

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
    const boundRad = Math.max(maxR, vertRad) * 1.05
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
      name={`GrassChunk [${bucket.key.cx},${bucket.key.cz}] obj:${bucket.key.objectUuid} count:${bucket.items.length}`}
      castShadow
      receiveShadow
      onClick={handleClick}
      onPointerOver={handleHover}
    >
      <meshStandardMaterial
          ref={materialRef as any}
          {...materialProps}
          envMapIntensity={1}
          alphaTest={0}
      />
    </instancedMesh>
  )
}

export default ChunkedInstancedGrass
