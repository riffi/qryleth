import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { GfxPrimitive } from '@/entities/primitive'
import { useObjectStore } from '@/features/editor/object/model/objectStore'
import { woodTextureRegistry, initializeWoodTextures } from '@/shared/lib/textures'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'


interface Primitive3DProps {
  primitive: GfxPrimitive
}

export const Primitive3D: React.FC<Primitive3DProps> = ({ primitive }) => {
  const { type, size, material } = primitive

  // Create geometry based on primitive type
  const renderGeometry = () => {
    switch (type) {
      case 'box':
        return (
          <boxGeometry
            args={[
              size?.width || 1,
              size?.height || 1,
              size?.depth || 1
            ]}
          />
        )

      case 'sphere':
        return (
          <sphereGeometry
            args={[
              size?.radius || 0.5,
              32, 32
            ]}
          />
        )

      case 'cylinder':
        return (
          <cylinderGeometry
            args={[
              size?.radiusTop || 0.5,
              size?.radiusBottom || 0.5,
              size?.height || 1,
              32
            ]}
          />
        )

      case 'cone':
        return (
          <coneGeometry
            args={[
              size?.radius || 0.5,
              size?.height || 1,
              32
            ]}
          />
        )

      case 'pyramid':
        return (
          <coneGeometry
            args={[
              size?.baseSize || 0.5,
              size?.height || 1,
              4 // 4 sides for pyramid
            ]}
          />
        )

      case 'plane':
        return (
          <planeGeometry
            args={[
              size?.width || 1,
              size?.height || 1
            ]}
          />
        )

      default:
        return <boxGeometry args={[1, 1, 1]} />
    }
  }

  // Create material based on primitive material
  const renderMaterial = () => {
    return (
      <meshLambertMaterial
        color={material?.color || '#ffffff'}
        transparent={material?.opacity !== undefined}
        opacity={material?.opacity || 1}
        wireframe={material?.wireframe || false}
      />
    )
  }

  return (
    <mesh castShadow receiveShadow>
      {renderGeometry()}
      {renderMaterial()}
    </mesh>
  )
}

interface Mesh3DProps {
  /** Примитив типа 'mesh' с произвольной геометрией */
  primitive: Extract<GfxPrimitive, { type: 'mesh' }>
  /** Свойства материала three.js (уже разрешённого с палитрой) */
  materialProps?: any
  /** Свойства меша three.js (позиция/вращение/скейл/теневые флаги) */
  meshProps?: any
}

/**
 * Рендер произвольной BufferGeometry из массивов позиций/нормалей/индексов.
 * Предназначено для единого меша ствола без видимых стыков.
 */
export const Mesh3D: React.FC<Mesh3DProps> = ({ primitive, materialProps, meshProps }) => {
  // Ленивая инициализация реестра текстур коры
  if (woodTextureRegistry.size === 0) {
    try { initializeWoodTextures() } catch { /* no-op */ }
  }
  const geom = primitive.geometry as any
  // Выбор набора коры: приоритет SceneEditor → ObjectEditor → дефолт
  // 1) SceneEditor: читаем параметры дерева из sceneStore по UUID объекта в userData
  // Возвращаем примитивы (string/number), чтобы избежать пересоздания объектов и лишних апдейтов.
  const objectUuid: string | undefined = (meshProps?.userData && (meshProps.userData as any).objectUuid) || undefined
  const sceneBarkId: string | undefined = useSceneStore(s => {
    if (!objectUuid) return undefined
    const obj = s.objects.find(o => o.uuid === objectUuid)
    return (obj as any)?.treeData?.params?.barkTextureSetId as string | undefined
  })
  const sceneBarkRu: number | undefined = useSceneStore(s => {
    if (!objectUuid) return undefined
    const obj = s.objects.find(o => o.uuid === objectUuid)
    return (obj as any)?.treeData?.params?.barkUvRepeatU as number | undefined
  })
  const sceneBarkRv: number | undefined = useSceneStore(s => {
    if (!objectUuid) return undefined
    const obj = s.objects.find(o => o.uuid === objectUuid)
    return (obj as any)?.treeData?.params?.barkUvRepeatV as number | undefined
  })
  // 2) ObjectEditor: fallback к objectStore
  const oeBarkSetId: string | undefined = useObjectStore(s => s.treeData?.params?.barkTextureSetId)
  const oeBarkRepeatU: number = useObjectStore(s => (s.treeData?.params?.barkUvRepeatU ?? 1))
  const oeBarkRepeatV: number = useObjectStore(s => (s.treeData?.params?.barkUvRepeatV ?? 1))
  // Итоговые значения
  const barkSetId: string | undefined = sceneBarkId ?? oeBarkSetId
  const barkRepeatU: number = (sceneBarkRu ?? oeBarkRepeatU ?? 1)
  const barkRepeatV: number = (sceneBarkRv ?? oeBarkRepeatV ?? 1)
  // Карты PBR для коры
  const [colorMap, setColorMap] = useState<THREE.Texture | null>(null)
  const [normalMap, setNormalMap] = useState<THREE.Texture | null>(null)
  const [roughnessMap, setRoughnessMap] = useState<THREE.Texture | null>(null)
  const [aoMap, setAoMap] = useState<THREE.Texture | null>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)

  /**
   * Загружает карты коры согласно выбранному набору из реестра woodTextureRegistry.
   * Применяется только для процедурного дерева; для прочих объектов не активируется.
   */
  useEffect(() => {
    const set = (barkSetId && woodTextureRegistry.get(barkSetId)) || woodTextureRegistry.list()[0]
    if (!set) return
    const loader = new THREE.TextureLoader()
    const onTex = (t: THREE.Texture | null) => {
      if (!t) return
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(Math.max(0.05, barkRepeatU || 1), Math.max(0.05, barkRepeatV || 1))
      t.anisotropy = 4
      t.needsUpdate = true
    }
    // diffuse/color
    loader.load(set.colorMapUrl, (t) => { onTex(t); (t as any).colorSpace = (THREE as any).SRGBColorSpace || (t as any).colorSpace; setColorMap(t) })
    // optional maps
    if (set.normalMapUrl) loader.load(set.normalMapUrl, (t) => { onTex(t); setNormalMap(t) })
    else setNormalMap(null)
    if (set.roughnessMapUrl) loader.load(set.roughnessMapUrl, (t) => { onTex(t); setRoughnessMap(t) })
    else setRoughnessMap(null)
    if (set.aoMapUrl) loader.load(set.aoMapUrl, (t) => { onTex(t); setAoMap(t) })
    else setAoMap(null)
  }, [barkSetId, barkRepeatU, barkRepeatV])

  // Форсируем обновление материала при смене карт
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.needsUpdate = true
    }
  }, [colorMap, normalMap, roughnessMap, aoMap])

  const bufferGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(geom.positions)
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    if (geom.normals && geom.normals.length === geom.positions.length) {
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(geom.normals), 3))
    } else {
      g.computeVertexNormals()
    }
    if (geom.uvs) {
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geom.uvs), 2))
    }
    if (geom.indices) g.setIndex(geom.indices)
    g.computeBoundingSphere()
    g.computeBoundingBox()
    return g
  }, [geom.positions, geom.normals, geom.indices, geom.uvs])

  return (
    <mesh {...(meshProps || {})} castShadow receiveShadow>
      <primitive object={bufferGeometry} attach="geometry" />
      <meshStandardMaterial
        ref={m => { materialRef.current = m }}
        {...(materialProps || {})}
        map={colorMap || undefined}
        normalMap={normalMap || undefined}
        roughnessMap={roughnessMap || undefined}
        aoMap={aoMap || undefined}
      />
    </mesh>
  )
}
