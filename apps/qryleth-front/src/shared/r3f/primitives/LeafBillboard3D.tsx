import React, { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { leafTextureRegistry } from '@/shared/lib/textures'
import { useObjectStore } from '@/features/editor/object/model/objectStore'

interface LeafBillboard3DProps {
  primitive: any
  materialProps: any
  meshProps: any
}

/**
 * Отдельный рендер одного листа в режиме 'texture' для Scene Editor (без инстансинга).
 * Загружает карты из публичной папки, применяет кроп из atlas.json и смещает плоскость
 * так, чтобы anchor‑точка попала в pivot (точку крепления к ветке).
 */
export const LeafBillboard3D: React.FC<LeafBillboard3DProps> = ({ primitive, materialProps, meshProps }) => {
  const shape = (primitive?.geometry as any)?.shape || 'billboard'
  const spriteName: string | undefined = (primitive?.geometry as any)?.texSpriteName
  // Идентификатор набора текстур берём из параметров дерева текущего объекта (ObjectEditor)
  const texSetId: string | undefined = useObjectStore(s => s.treeData?.params?.leafTextureSetId)

  // Текстуры и параметры
  const [diffuseMap, setDiffuseMap] = useState<THREE.Texture | null>(null)
  const [alphaMap, setAlphaMap] = useState<THREE.Texture | null>(null)
  const [normalMap, setNormalMap] = useState<THREE.Texture | null>(null)
  const [roughnessMap, setRoughnessMap] = useState<THREE.Texture | null>(null)
  const [texAspect, setTexAspect] = useState<number>(1)
  const [atlas, setAtlas] = useState<{ name: string; x: number; y: number; width: number; height: number; anchorX?: number; anchorY?: number; anchor?: { x: number; y: number } }[] | null>(null)
  const [anchorUV, setAnchorUV] = useState<[number, number] | null>(null)

  // Загрузка текстур
  // Метод подбирает активный набор из реестра (первый доступный), либо использует старый путь как резерв.
  useEffect(() => {
    if (shape !== 'texture') return
    const loader = new THREE.TextureLoader()
    const set = (texSetId && leafTextureRegistry.get(texSetId)) || leafTextureRegistry.list()[0] || leafTextureRegistry.get('leafset019-1k-jpg')
    const colorUrl = set?.colorMapUrl || '/texture/leaf/LeafSet019_1K-JPG/LeafSet019_1K-JPG_Color.jpg'
    const opacityUrl = set?.opacityMapUrl || '/texture/leaf/LeafSet019_1K-JPG/LeafSet019_1K-JPG_Opacity.jpg'
    const normalUrl = set?.normalMapUrl || '/texture/leaf/LeafSet019_1K-JPG/LeafSet019_1K-JPG_NormalGL.jpg'
    const roughnessUrl = set?.roughnessMapUrl || '/texture/leaf/LeafSet019_1K-JPG/LeafSet019_1K-JPG_Roughness.jpg'
    /**
     * Устанавливает параметры загруженной текстуры для корректной работы кропа и фильтрации.
     * Применяется ко всем картам набора.
     */
    const onTex = (t: THREE.Texture | null) => {
      if (!t) return
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
      t.anisotropy = 4
      t.needsUpdate = true
    }
    loader.load(colorUrl, (t2) => {
      onTex(t2)
      t2.center.set(0.0, 0.0)
      t2.rotation = 0
      setDiffuseMap(t2)
      const img2: any = t2.image
      if (img2 && img2.width && img2.height) setTexAspect(img2.width / img2.height)
    })
    loader.load(opacityUrl, (t) => { onTex(t); t.center.set(0.0,0.0); t.rotation = 0; setAlphaMap(t) })
    loader.load(normalUrl, (t) => { onTex(t); t.center.set(0.0,0.0); t.rotation = 0; setNormalMap(t) })
    loader.load(roughnessUrl, (t) => { onTex(t); t.center.set(0.0,0.0); t.rotation = 0; setRoughnessMap(t) })
  }, [shape, texSetId])

  // Загрузка атласа
  // Использует atlasUrl из активного набора реестра; при отсутствии — резервный путь.
  useEffect(() => {
    if (shape !== 'texture') return
    const set = (texSetId && leafTextureRegistry.get(texSetId)) || leafTextureRegistry.list()[0] || leafTextureRegistry.get('leafset019-1k-jpg')
    const atlasUrl = set?.atlasUrl || '/texture/leaf/LeafSet019_1K-JPG/atlas.json'
    fetch(atlasUrl)
      .then(r => r.json())
      .then(setAtlas)
      .catch(() => setAtlas(null))
  }, [shape, texSetId])

  // Применяем вырезку и anchor
  useEffect(() => {
    if (shape !== 'texture') return
    if (!diffuseMap) return
    const img: any = diffuseMap.image
    if (!img || !img.width || !img.height) return
    const W = img.width, H = img.height
    const items = atlas || []
    const rect: any = (items.find(i => i.name === spriteName) || items[0])
    if (!rect) return
    const repX = rect.width / W
    const repY = rect.height / H
    const offX = rect.x / W
    const offYFlipTrue = 1 - (rect.y + rect.height) / H
    const offYFlipFalse = rect.y / H
    const applyRect = (t: THREE.Texture | null) => {
      if (!t) return
      t.repeat.set(repX, repY)
      t.offset.set(offX, t.flipY ? offYFlipTrue : offYFlipFalse)
      t.center.set(0.0, 0.0)
      t.rotation = 0
      t.needsUpdate = true
    }
    applyRect(diffuseMap); applyRect(alphaMap); applyRect(normalMap); applyRect(roughnessMap)
    setTexAspect(rect.width / rect.height)
    // Anchor
    const ax = typeof rect.anchorX === 'number' ? rect.anchorX : (rect.anchor?.x)
    const ay = typeof rect.anchorY === 'number' ? rect.anchorY : (rect.anchor?.y)
    if (typeof ax === 'number' && typeof ay === 'number' && rect.width > 0 && rect.height > 0) {
      const uN = Math.min(1, Math.max(0, ax / rect.width))
      const vN = Math.min(1, Math.max(0, ay / rect.height))
      setAnchorUV([uN, vN])
    } else {
      setAnchorUV([0.5, 1.0])
    }
  }, [shape, atlas, diffuseMap, alphaMap, normalMap, roughnessMap, spriteName])

  const [groupPos, groupRot] = [meshProps.position || [0,0,0], meshProps.rotation || [0,0,0]]
  // Не позволяем scale из meshProps влиять на смещение anchor: вычищаем его из пропсов группы
  const { position: _p, rotation: _r, scale: _s, ...restMeshProps } = meshProps || {}
  const radius: number = (primitive?.geometry as any)?.radius || 0.5
  const [psx, psy, psz] = primitive?.transform?.scale || [1,1,1]
  // Масштаб листа: радиус с учётом локального scale примитива (как в OE: корень третьей степени объёма)
  const uniformScale = radius * Math.cbrt(Math.abs(psx * psy * psz))
  const sx = shape === 'texture' ? uniformScale * (texAspect || 1) : uniformScale
  const sy = uniformScale
  const sz = uniformScale

  // Смещение по anchor: перенос anchor_local в центр плоскости
  const offVec = useMemo(() => {
    if (shape !== 'texture') return new THREE.Vector3(0,0,0)
    const u = anchorUV?.[0] ?? 0.5
    const v = anchorUV?.[1] ?? 1.0
    const dx = (0.5 - u) * sx
    const dy = (v - 0.5) * sy
    // В локальных координатах плоскости; поворот применяется на родительской группе
    return new THREE.Vector3(dx, dy, 0)
  }, [shape, anchorUV, sx, sy])

  return (
    <group position={groupPos} rotation={groupRot} scale={[1,1,1]} {...restMeshProps}>
      <mesh position={[offVec.x, offVec.y, offVec.z]} scale={[sx, sy, sz]}>
        <planeGeometry args={[1, 1, 1, 1]} />
        <meshStandardMaterial
          {...materialProps}
          side={THREE.DoubleSide}
          map={shape === 'texture' ? diffuseMap || undefined : undefined}
          alphaMap={shape === 'texture' ? alphaMap || undefined : undefined}
          normalMap={shape === 'texture' ? normalMap || undefined : undefined}
          roughnessMap={shape === 'texture' ? roughnessMap || undefined : undefined}
          transparent={shape === 'texture' ? true : materialProps.transparent}
          alphaTest={shape === 'texture' ? 0.5 : materialProps.alphaTest}
        />
      </mesh>
    </group>
  )
}

export default LeafBillboard3D
