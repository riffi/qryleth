import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { SceneLayer, SceneObject, SceneObjectInstance } from '@/entities/scene/types'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import { usePartitionInstancesByLod, defaultTreeLodConfig } from '@/shared/r3f/optimization/treeLod'
import { getOrCreateTreeBillboard } from '@/shared/r3f/optimization/TreeBillboardBaker'
import { useThree, useFrame } from '@react-three/fiber'
import { patchBillboardMaterial } from '@/shared/r3f/billboard/patchBillboardMaterial'
import { SCENE_BILLBOARD_BORDER_DEBUG } from '@/shared/r3f/optimization/flags'

interface ChunkKey { cx: number; cz: number; objectUuid: string; paletteUuid: string }
interface ChunkBucket { key: ChunkKey; items: SceneObjectInstance[]; object: SceneObject }

function isInstanceVisible(instance: SceneObjectInstance, object: SceneObject, layers: SceneLayer[]): boolean {
  const layerId = object.layerId || 'objects'
  const layer = layers.find(l => l.id === layerId)
  const isLayerVisible = layer ? layer.visible : true
  const isObjectVisible = object.visible !== false
  const isInstanceVisible = instance.visible !== false
  return isLayerVisible && isObjectVisible && isInstanceVisible
}

function keyOf(k: ChunkKey): string { return `${k.cx}|${k.cz}|${k.objectUuid}|${k.paletteUuid}` }

export interface ChunkedTreeBillboardsProps {
  objects: SceneObject[]
  instances: SceneObjectInstance[]
  layers: SceneLayer[]
  chunkSize?: number
  onClick?: (e: any) => void
  onHover?: (e: any) => void
}

/**
 * Сценовая сегментация LOD3: билборды деревьев. Агрегирует инстансы по чанкам 32м
 * и по objectUuid+paletteUuid. На чанк — один InstancedMesh с плоскостью, ориентируемой
 * к камере по оси Y (вращаем группу). Текстуры генерируются лениво и кэшируются в памяти.
 */
export const ChunkedTreeBillboards: React.FC<ChunkedTreeBillboardsProps> = ({ objects, instances, layers, chunkSize = 32, onClick, onHover }) => {
  const paletteUuid = useSceneStore(s => s.environmentContent?.paletteUuid || 'default')
  const objectsById = useMemo(() => new Map(objects.map(o => [o.uuid, o])), [objects])
  const visibleInstances = useMemo(() => instances.filter(inst => {
    const obj = objectsById.get(inst.objectUuid)
    return !!obj && isInstanceVisible(inst, obj, layers)
  }), [instances, objectsById, layers])

  // Разделяем по LOD и берём только billboardInstances
  const { billboardInstances } = usePartitionInstancesByLod(visibleInstances, defaultTreeLodConfig)

  // Бакетизация по чанкам
  const buckets = useMemo(() => {
    const map = new Map<string, ChunkBucket>()
    const half = chunkSize * 0.5
    for (const inst of billboardInstances) {
      const obj = objectsById.get(inst.objectUuid)
      if (!obj) continue
      const p = inst.transform?.position || [0,0,0]
      const cx = Math.floor(p[0] / chunkSize) * chunkSize + half
      const cz = Math.floor(p[2] / chunkSize) * chunkSize + half
      const key: ChunkKey = { cx, cz, objectUuid: obj.uuid, paletteUuid }
      const ks = keyOf(key)
      let b = map.get(ks)
      if (!b) { b = { key, items: [], object: obj }; map.set(ks, b) }
      b.items.push(inst)
    }
    return [...map.values()]
  }, [billboardInstances, objectsById, paletteUuid, chunkSize])

  // Отказ от поворота группы (смещал XZ). Поворот к камере реализуем пер‑инстансно ниже (в дочернем компоненте).

  if (buckets.length === 0) return null

  return (
    <group>
      {buckets.map((b) => (
        <BillboardChunkMesh
          key={keyOf(b.key)}
          bucket={b}
          paletteUuid={paletteUuid}
          onClick={onClick}
          onHover={onHover}
        />
      ))}
    </group>
  )
}

const BillboardChunkMesh: React.FC<{
  bucket: ChunkBucket
  paletteUuid: string
  onClick?: (e: any) => void
  onHover?: (e: any) => void
}> = ({ bucket, paletteUuid, onClick, onHover }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const [billboard, setBillboard] = React.useState<Awaited<ReturnType<typeof getOrCreateTreeBillboard>> | null>(null)
  const lastYawRef = useRef<number | null>(null)
  const { camera } = useThree()

  useEffect(() => {
    let alive = true
    ;(async () => {
      const data = await getOrCreateTreeBillboard(bucket.object, paletteUuid)
      if (!alive) return
      setBillboard(data)
    })()
    return () => { alive = false }
  }, [bucket.object, paletteUuid])

  // Геометрия плоскости 1x1 с якорем по нижней середине
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1)
    g.translate(0, 0.5, 0)
    return g
  }, [])

  // Первичная укладка матриц (yaw=0) + расчёт boundingSphere
  useEffect(() => {
    if (!meshRef.current || !billboard) return
    const dummy = new THREE.Object3D()
    const cx = bucket.key.cx, cz = bucket.key.cz
    let minY = Number.POSITIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    let maxR = 0
    for (let k = 0; k < bucket.items.length; k++) {
      const inst = bucket.items[k]
      const t = inst.transform || {}
      const [ix, iy, iz] = t.position || [0,0,0]
      const [isx, isy, isz] = t.scale || [1,1,1]
      const u = Math.cbrt(Math.abs(isx * isy * isz))
      const height = (billboard.heightWorld || 10) * u
      const width = (billboard.widthWorld || (billboard.heightWorld || 10)) * u
      const lx = ix - cx
      const lz = iz - cz
      // Ставим плоскость основанием точно на уровень инстанса (iy)
      const ly = iy
      dummy.position.set(lx, ly, lz)
      dummy.quaternion.set(0,0,0,1)
      dummy.scale.set(width, height, 1)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(k, dummy.matrix)
      minY = Math.min(minY, ly)
      maxY = Math.max(maxY, ly + height)
      const halfDiag = Math.max(width, height) * 0.5
      maxR = Math.max(maxR, Math.hypot(lx, lz) + halfDiag)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    const centerY = (minY + maxY) * 0.5
    const vertRad = (maxY - minY) * 0.5
    const boundRad = Math.max(maxR, vertRad)
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, centerY, 0), boundRad)
  }, [bucket.items, geometry, billboard])

  // Поворот к камере: обновляем кватернион инстансов при изменении yaw (позиции XZ и высоты не меняем)
  useFrame(() => {
    if (!meshRef.current || !billboard) return
    const dx = camera.position.x - bucket.key.cx
    const dz = camera.position.z - bucket.key.cz
    const yaw = Math.atan2(dx, dz)
    if (lastYawRef.current != null && Math.abs(yaw - lastYawRef.current) < 1e-3) return
    lastYawRef.current = yaw
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0, 'XYZ'))
    const dummy = new THREE.Object3D()
    const m = new THREE.Matrix4()
    for (let k = 0; k < bucket.items.length; k++) {
      // Читаем текущую матрицу (T * I * S), заменяем вращение на yaw
      meshRef.current.getMatrixAt(k, m)
      m.decompose(dummy.position, dummy.quaternion, dummy.scale)
      dummy.quaternion.copy(q)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(k, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

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

  if (!billboard || bucket.items.length === 0) return (
    <group position={[bucket.key.cx, 0, bucket.key.cz]} />
  )

  // Нормализуем ориентацию CanvasTexture: фиксируем поворот на 180°, чтобы исключить случайный инверт по Y
  try {
    billboard.texture.center.set(0.5, 0.5)
    billboard.texture.rotation = Math.PI
    billboard.texture.flipY = true
    billboard.texture.needsUpdate = true
  } catch {}

  return (
    <group position={[bucket.key.cx, 0, bucket.key.cz]}>
      <instancedMesh
        ref={meshRef}
        args={[geometry as any, undefined as any, bucket.items.length]}
        castShadow={false}
        receiveShadow={false}
        onClick={handleClick}
        onPointerOver={handleHover}
      >
        <meshStandardMaterial
          ref={(m) => { if (m) { patchBillboardMaterial(m, { rectDebug: SCENE_BILLBOARD_BORDER_DEBUG, rectColor: 0xff00ff, rectWidth: 0.02, alphaThreshold: 0.5 }) } }}
          map={billboard.texture}
          transparent={false}
          alphaTest={0.5}
          roughness={0.8}
          metalness={0.0}
          envMapIntensity={0}
          side={THREE.DoubleSide}
          depthWrite={true}
        />
      </instancedMesh>
    </group>
  )
}

export default ChunkedTreeBillboards
