import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { SceneLayer, SceneObject, SceneObjectInstance } from '@/entities/scene/types'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import { usePartitionGrassByLod } from '@/shared/r3f/optimization/grassLod'
import { getOrCreateGrassBillboardSet } from '@/shared/r3f/optimization/GrassBillboardBaker'
import { useThree } from '@react-three/fiber'

interface ChunkKey { cx: number; cz: number; objectUuid: string; paletteUuid: string }
interface ChunkBucket { key: ChunkKey; items: SceneObjectInstance[]; object: SceneObject }

function isInstanceVisible(instance: SceneObjectInstance, object: SceneObject, layers: SceneLayer[], hiddenBiomeUuids?: Set<string>): boolean {
  const layerId = object.layerId || 'objects'
  const layer = layers.find(l => l.id === layerId)
  const isLayerVisible = layer ? layer.visible : true
  const isObjectVisible = object.visible !== false
  const isInstanceVisible = instance.visible !== false
  const biomeVisible = !instance.biomeUuid || !(hiddenBiomeUuids && hiddenBiomeUuids.has(instance.biomeUuid))
  return isLayerVisible && isObjectVisible && isInstanceVisible && biomeVisible
}

function keyOf(k: ChunkKey): string { return `${k.cx}|${k.cz}|${k.objectUuid}|${k.paletteUuid}` }

export interface ChunkedGrassLod2Props {
  objects: SceneObject[]
  instances: SceneObjectInstance[]
  layers: SceneLayer[]
  chunkSize?: number
  offset?: number
  onClick?: (e: any) => void
  onHover?: (e: any) => void
}

/**
 * LOD2 для травы: три вертикальные плоскости, повернутые на 120° вокруг Y, сдвинутые вдоль нормали на offset.
 * Для каждого объекта бэйкаем три текстуры (0/120/240) и используем их на соответствующих плоскостях.
 */
export const ChunkedGrassLod2: React.FC<ChunkedGrassLod2Props> = ({ objects, instances, layers, chunkSize = 64, offset = 0.02, onClick, onHover }) => {
  const paletteUuid = useSceneStore(s => s.environmentContent?.paletteUuid || 'default')
  const lodCfg = useSceneStore(s => s.grassLodConfig)
  const objectsById = useMemo(() => new Map(objects.map(o => [o.uuid, o])), [objects])
  const biomes = useSceneStore(s => s.biomes)
  const hiddenBiomeUuids = useMemo(() => new Set((biomes || []).filter(b => b.visible === false).map(b => b.uuid)), [biomes])

  const visibleInstances = useMemo(() => instances.filter(inst => {
    const obj = objectsById.get(inst.objectUuid)
    if (!obj) return false
    if ((obj as any).objectType !== 'grass') return false
    return isInstanceVisible(inst, obj, layers, hiddenBiomeUuids)
  }), [instances, objectsById, layers, hiddenBiomeUuids])

  // Разделение по LOD, используем двухуровневый режим Near/Far
  const { nearSolid, farSolid } = usePartitionGrassByLod(visibleInstances, {
    enabled: lodCfg.enabled,
    nearInPx: lodCfg.nearInPx,
    nearOutPx: lodCfg.nearOutPx,
    approximateGrassHeightWorld: 1.0,
  })

  const farInstances = farSolid || []

  // Бакетизация Far-инстансов по чанкам и объектам
  const buckets = useMemo(() => {
    const map = new Map<string, ChunkBucket>()
    const half = chunkSize * 0.5
    for (const inst of farInstances) {
      const obj = objectsById.get(inst.objectUuid)
      if (!obj) continue
      const p = inst.transform?.position || [0,0,0]
      const cx = Math.floor(p[0] / chunkSize) * chunkSize + half
      const cz = Math.floor(p[2] / chunkSize) * chunkSize + half
      const key: ChunkKey = { cx, cz, objectUuid: inst.objectUuid, paletteUuid }
      const ks = keyOf(key)
      let b = map.get(ks)
      if (!b) { b = { key, items: [], object: obj }; map.set(ks, b) }
      b.items.push(inst)
    }
    return [...map.values()]
  }, [farInstances, objectsById, chunkSize, paletteUuid])

  if (buckets.length === 0) return null
  return (
    <group name="GrassLOD2">
      {buckets.map(b => (
        <GrassLod2Chunk key={keyOf(b.key)} bucket={b} paletteUuid={paletteUuid} offset={offset} onClick={onClick} onHover={onHover} />
      ))}
    </group>
  )
}

const GrassLod2Chunk: React.FC<{ bucket: ChunkBucket; paletteUuid: string; offset: number; onClick?: (e:any)=>void; onHover?: (e:any)=>void }>
  = ({ bucket, paletteUuid, offset, onClick, onHover }) => {
  const meshRefs = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)]
  const [bill, setBill] = React.useState<Awaited<ReturnType<typeof getOrCreateGrassBillboardSet>> | null>(null)
  const { camera } = useThree()

  useEffect(() => {
    let alive = true
    ;(async () => {
      const data = await getOrCreateGrassBillboardSet(bucket.object, paletteUuid)
      if (!alive) return
      if (data) {
        try {
          // Синхронизация ориентации с ObjectEditor: центр (0.5,0.5), поворот PI, flipY=true
          data.textures.forEach(t => { t.center.set(0.5, 0.5); t.rotation = Math.PI; t.flipY = true; t.needsUpdate = true })
          ;(data as any).normalTextures?.forEach((t: any) => { t.center?.set?.(0.5, 0.5); t.rotation = Math.PI; t.flipY = true; t.needsUpdate = true })
        } catch {}
        setBill(data)
      } else {
        setBill(null)
      }
    })()
    return () => { alive = false }
  }, [bucket.object, paletteUuid])

  // Одна геометрия плоскости 1x1 (якорь снизу по центру)
  const geometry = useMemo(() => { const g = new THREE.PlaneGeometry(1,1); g.translate(0,0.5,0); return g }, [])

  // Cleanup
  useEffect(() => { return () => {
    try { geometry.dispose() } catch {}
    try { ((meshRefs[0].current?.material as any) as THREE.Material)?.dispose?.() } catch {}
    try { ((meshRefs[1].current?.material as any) as THREE.Material)?.dispose?.() } catch {}
    try { ((meshRefs[2].current?.material as any) as THREE.Material)?.dispose?.() } catch {}
  }}, [geometry])

  // Укладка матриц для всех трёх наборов плоскостей
  useEffect(() => {
    if (!bill) return
    // Переопределяем глобальный offset объектным значением из grassData.params.lod2Offset, если задано
    const objectOffset = (bucket.object as any)?.grassData?.params?.lod2Offset
    const effectiveOffset = (typeof objectOffset === 'number' && objectOffset >= 0) ? objectOffset : offset
    const dummies = [new THREE.Object3D(), new THREE.Object3D(), new THREE.Object3D()]
    const baseYaws = [0, 120, 240].map(a => THREE.MathUtils.degToRad(a))
    // Подготовим масштаб по высоте/ширине для каждой стороны
    const scales: [number, number, number][] = bill.widthWorlds.map((w) => [w, bill.heightWorld, 1]) as any

    const cx = bucket.key.cx, cz = bucket.key.cz
    const dummyMat = new THREE.Matrix4()
    let maxHoriz = 0

    for (let idx = 0; idx < bucket.items.length; idx++) {
      const inst = bucket.items[idx]
      const t = inst.transform || {}
      const [ix, iy, iz] = t.position || [0,0,0]
      const [irx, iry, irz] = t.rotation || [0,0,0]
      const [isx, isy, isz] = t.scale || [1,1,1]
      const qInst = new THREE.Quaternion().setFromEuler(new THREE.Euler(irx, iry, irz, 'XYZ'))
      const u = Math.cbrt(Math.abs(isx*isy*isz))
      for (let k=0; k<3; k++) {
        const ref = meshRefs[k].current
        if (!ref) continue
        const d = dummies[k]
        const yaw = baseYaws[k]
        const qYaw = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0, 'XYZ'))
        const qFinal = new THREE.Quaternion().copy(qInst).multiply(qYaw)
        // Локальная нормаль плоскости +Z после qFinal — для сдвига offset
        const n = new THREE.Vector3(0,0,1).applyQuaternion(qFinal)
        const off = n.multiplyScalar(effectiveOffset)

        const lx = ix - cx, lz = iz - cz
        d.position.set(lx + off.x, iy + off.y, lz + off.z)
        d.quaternion.copy(qFinal)
        d.scale.set(scales[k][0]*u, scales[k][1]*u, scales[k][2])
        d.updateMatrix()
        ref.setMatrixAt(idx, d.matrix)
        const dh = Math.hypot(lx, lz)
        if (dh > maxHoriz) maxHoriz = dh
      }
    }
    meshRefs.forEach(r => { if (r.current) r.current.instanceMatrix.needsUpdate = true })

    // BoundingSphere по максимальному радиусу (упрощённо)
    const radius = Math.max(maxHoriz + Math.max(...bill.widthWorlds)*0.75, bill.heightWorld*0.6)
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, bill.heightWorld*0.5, 0), radius)
  }, [bill, bucket.items, bucket.key.cx, bucket.key.cz, geometry, offset, bucket.object])

  const handleClick = (event: any) => {
    if (!onClick) return
    const idx: number = (event as any).instanceId
    if (idx == null || idx < 0 || idx >= bucket.items.length) return
    const it = bucket.items[idx]
    const syntheticObject = { userData: { generated: true, objectUuid: it.objectUuid, objectInstanceUuid: it.uuid, isInstanced: true, layerId: bucket.object.layerId || 'objects' } }
    onClick({ ...event, object: syntheticObject })
  }
  const handleHover = (event: any) => {
    if (!onHover) return
    const idx: number = (event as any).instanceId
    if (idx == null || idx < 0 || idx >= bucket.items.length) return
    const it = bucket.items[idx]
    const syntheticObject = { userData: { generated: true, objectUuid: it.objectUuid, objectInstanceUuid: it.uuid, isInstanced: true, layerId: bucket.object.layerId || 'objects' } }
    onHover({ ...event, object: syntheticObject })
  }

  if (!bill) return null

  return (
    <group position={[bucket.key.cx, 0, bucket.key.cz]}>
      {[0,1,2].map(i => (
        <instancedMesh
          key={`plane-${i}`}
          ref={meshRefs[i]}
          args={[geometry as any, undefined as any, bucket.items.length]}
          castShadow
          receiveShadow={false}
          onClick={handleClick}
          onPointerOver={handleHover}
        >
          <meshStandardMaterial
            map={bill.textures[i]}
            normalMap={bill.normalTextures[i]}
            // Чуть уменьшаем силу нормалей, чтобы избежать перетемнения
            normalScale={new THREE.Vector2(0.75, 0.75)}
            roughness={0.8}
            metalness={0.0}
            // Добавляем лёгкую эмиссию из albedo для компенсации потери насыщенности
            emissive={'#ffffff'}
            emissiveIntensity={10}
            emissiveMap={bill.textures[i]}
            transparent={false}
            alphaTest={0.5}
            side={THREE.DoubleSide}
            envMapIntensity={1}
          />
        </instancedMesh>
      ))}
    </group>
  )
}

export default ChunkedGrassLod2
